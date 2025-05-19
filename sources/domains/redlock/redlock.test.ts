import assert from 'node:assert/strict';
import test from 'node:test';

import { SolidisClient } from '@vcms-io/solidis';
import { del } from '@vcms-io/solidis/command/del';
import { evaluate } from '@vcms-io/solidis/command/eval';
import { evalsha } from '@vcms-io/solidis/command/evalsha';
import { get } from '@vcms-io/solidis/command/get';
import { scriptExists } from '@vcms-io/solidis/command/script.exists';
import { scriptLoad } from '@vcms-io/solidis/command/script.load';
import { set } from '@vcms-io/solidis/command/set';

import { redLock } from './index.ts';

import type { SolidisClientExtensions } from '@vcms-io/solidis';

const extensions = {
  set,
  get,
  del,
  scriptLoad,
  scriptExists,
  evalsha,
  eval: evaluate,
} satisfies SolidisClientExtensions;

function createClients(
  uris = [
    'redis://localhost:6379',
    'redis://localhost:6380',
    'redis://localhost:6381',
  ],
) {
  return uris.map((uri) => new SolidisClient({ uri }).extend(extensions));
}

async function disconnectClients(clients: SolidisClient[]) {
  await Promise.all(clients.map((client) => client.quit()));
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function fullLockKey(key: string, prefix = 'redLock') {
  return `${prefix ? `${prefix}:` : ''}${key}`;
}

async function preLock(
  clients: ReturnType<typeof createClients>,
  key: string,
  prefix = 'redLock',
) {
  const lockKey = fullLockKey(key, prefix);

  await Promise.all(
    clients.map((client) =>
      client.set(lockKey, 'conflict', { expireInMilliseconds: 10000 }),
    ),
  );
}

test('RedLock full lifecycle succeeds', async () => {
  const clients = createClients();

  try {
    const lockTimeout = 500;
    const lock = await redLock(clients, 'lifecycle', {
      lockTimeout,
      logger: console,
    });

    assert.ok(lock.getRemainingTime() > 0, 'remaining time should be > 0');

    const extendOk = await lock.extend(1000);
    assert.equal(extendOk, true, 'extend should succeed');

    await sleep(50);
    const refreshOk = await lock.refresh();
    assert.equal(refreshOk, true, 'refresh should succeed');

    const unlockOk = await lock.unlock();
    assert.equal(unlockOk, true, 'unlock should succeed');
  } finally {
    await disconnectClients(clients);
  }
});

test('Throws when less than 3 clients are provided', async () => {
  const clients = createClients().slice(0, 2);

  try {
    await assert.rejects(() => redLock(clients, 'tooFew'));
  } finally {
    await disconnectClients(clients);
  }
});

test('Acquire fails when quorum is not reached', async () => {
  const clients = createClients();

  try {
    await preLock(clients.slice(0, 2), 'noQuorum');

    await assert.rejects(() => redLock(clients, 'noQuorum', { retryCount: 1 }));
  } finally {
    await disconnectClients(clients);
  }
});

test('Extend fails when quorum is lost', async () => {
  const clients = createClients();

  try {
    const lock = await redLock(clients, 'extendFail');

    await preLock(clients.slice(0, 2), 'extendFail');

    const ok = await lock.extend(1000);

    assert.equal(ok, false, 'extend should fail');
  } finally {
    await disconnectClients(clients);
  }
});

test('Refresh fails when quorum is lost', async () => {
  const clients = createClients();

  try {
    const lock = await redLock(clients, 'refreshFail');

    await preLock(clients.slice(0, 2), 'refreshFail');

    const ok = await lock.refresh();

    assert.equal(ok, false, 'refresh should fail');
  } finally {
    await disconnectClients(clients);
  }
});

test('Unlock fails when quorum is lost', async () => {
  const clients = createClients();

  try {
    const lock = await redLock(clients, 'unlockFail');

    await preLock(clients.slice(0, 2), 'unlockFail');

    const ok = await lock.unlock();

    assert.equal(ok, false, 'unlock should fail');
  } finally {
    await disconnectClients(clients);
  }
});

test('Extend fails after lock expiry', async () => {
  const clients = createClients();

  try {
    const lockTimeout = 150;
    const lock = await redLock(clients, 'extendExpiry', {
      lockTimeout,
      logger: console,
    });

    await sleep(lockTimeout + 100);

    const ok = await lock.extend(1000);

    assert.equal(ok, false, 'extend after expiry should fail');
  } finally {
    await disconnectClients(clients);
  }
});

test('Refresh fails after lock expiry', async () => {
  const clients = createClients();

  try {
    const lockTimeout = 150;
    const lock = await redLock(clients, 'refreshExpiry', {
      lockTimeout,
      logger: console,
    });

    await sleep(lockTimeout + 100);

    const ok = await lock.refresh();

    assert.equal(ok, false, 'refresh after expiry should fail');
  } finally {
    await disconnectClients(clients);
  }
});

test('getRemainingTime decreases and reaches zero', async () => {
  const clients = createClients();

  try {
    const lockTimeout = 120;
    const lock = await redLock(clients, 'remainingTime', {
      lockTimeout,
      logger: console,
    });

    const initial = lock.getRemainingTime();

    await sleep(60);

    const mid = lock.getRemainingTime();

    assert.ok(mid < initial && mid > 0, 'remaining time should decrease');

    await sleep(lockTimeout + 100);

    const final = lock.getRemainingTime();

    assert.equal(final, 0, 'remaining time should be 0 after expiry');
  } finally {
    await disconnectClients(clients);
  }
});
