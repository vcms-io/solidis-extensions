import { randomUUID } from 'node:crypto';

import { timeout } from '../../common/utils.ts';
import {
  ACQUIRE_SCRIPT,
  EXTEND_SCRIPT,
  REFRESH_SCRIPT,
  RELEASE_SCRIPT,
} from './scripts.ts';

import type {
  CheckAndLoadScriptOptions,
  ExecuteScriptAcrossClientsOptions,
  Lock,
  Logger,
  RedLockOptions,
  ScriptHashes,
  ScriptName,
  SolidisExtendedClient,
} from './types.ts';

function computeDrift(lockTimeout: number, driftFactor: number) {
  return Math.round(lockTimeout * driftFactor) + 2;
}

function generateLockKey(prefix: string, key: string) {
  return `${prefix ? `${prefix}:` : ''}${key}`;
}

async function checkAndLoadScript({
  client,
  name,
  script,
  sha1,
  logger,
}: CheckAndLoadScriptOptions) {
  const exists = await client.scriptExists([sha1]);

  if (!exists[0]) {
    await client.scriptLoad(script);

    logger?.debug(`Script ${name} loaded on client uri: ${client.uri}`);

    return;
  }

  logger?.debug(`Script ${name} already exists on client uri: ${client.uri}`);
}

async function loadScripts(
  solidisClients: SolidisExtendedClient[],
  logger?: Logger,
): Promise<ScriptHashes> {
  const firstInstance = solidisClients[0];

  const scripts: { name: ScriptName; script: string }[] = [
    { name: 'acquire', script: ACQUIRE_SCRIPT },
    { name: 'release', script: RELEASE_SCRIPT },
    { name: 'extend', script: EXTEND_SCRIPT },
    { name: 'refresh', script: REFRESH_SCRIPT },
  ];

  const scriptHashes: ScriptHashes = {
    acquire: '',
    release: '',
    extend: '',
    refresh: '',
  };

  await Promise.all(
    scripts.map(async ({ name, script }) => {
      const sha1 = await firstInstance.scriptLoad(script);

      scriptHashes[name] = sha1;

      logger?.debug(`Script ${name} loaded on first client with hash ${sha1}`);
    }),
  );

  await Promise.all(
    solidisClients.slice(1).map(async (client) => {
      try {
        await Promise.all(
          scripts.map(({ name, script }) =>
            checkAndLoadScript({
              client,
              name,
              script,
              sha1: scriptHashes[name],
              logger,
            }),
          ),
        );
      } catch (error) {
        logger?.debug(
          `Failed to load scripts on client uri: ${client.uri}`,
          error,
        );

        throw error;
      }
    }),
  );

  return scriptHashes;
}

async function executeScriptAcrossClients({
  clients,
  scriptHash,
  keys,
  parameters,
  logger,
}: ExecuteScriptAcrossClientsOptions): Promise<string[]> {
  const results = await Promise.all(
    clients.map(async (client) => {
      try {
        const result = await client.evalsha(scriptHash, keys, parameters);

        if (result === 1 || result === 'OK') {
          logger?.debug(
            `Script ${scriptHash} succeeded on client uri: ${client.uri}`,
            result,
          );

          return client.uri;
        }

        logger?.debug(
          `Script ${scriptHash} failed on client uri: ${client.uri}`,
          result,
        );
      } catch (error) {
        logger?.debug(
          `Script ${scriptHash} failed on client uri: ${client.uri}`,
          error,
        );
      }

      return null;
    }),
  );

  return results.filter((result): result is string => result !== null);
}

export async function redLock(
  solidisClients: SolidisExtendedClient[],
  key: string,
  options: RedLockOptions = {},
): Promise<Lock> {
  if (solidisClients.length < 3) {
    throw new Error(
      'RedLock requires at least 3 solidis clients for proper fault tolerance',
    );
  }

  const {
    logger,
    lockTimeout = 10000,
    retryCount = 3,
    retryDelay = 200,
    driftFactor = 0.01,
    prefix = 'redLock',
  } = options;

  const drift = computeDrift(lockTimeout, driftFactor);
  const lockValue = randomUUID();
  const quorum = Math.floor(solidisClients.length / 2) + 1;
  const lockKey = generateLockKey(prefix, key);

  const scriptHashes = await loadScripts(solidisClients, logger);

  for (let attempt = 0; attempt < retryCount; attempt++) {
    const startTime = Date.now();

    const successfulLocks = await executeScriptAcrossClients({
      clients: solidisClients,
      scriptHash: scriptHashes.acquire,
      keys: [lockKey],
      parameters: [lockValue, lockTimeout.toString()],
      logger,
    });

    const elapsedTime = Date.now() - startTime;
    const validityTime = lockTimeout - elapsedTime - drift;

    if (successfulLocks.length >= quorum && validityTime > 0) {
      const expiryTimestamp = Date.now() + validityTime;

      logger?.debug(
        `Acquired RedLock for key '${lockKey}' on ${successfulLocks.length} clients`,
      );

      const extend = async (extensionTime: number): Promise<boolean> => {
        const extended = await executeScriptAcrossClients({
          clients: solidisClients,
          scriptHash: scriptHashes.extend,
          keys: [lockKey],
          parameters: [lockValue, extensionTime.toString()],
          logger,
        });

        logger?.debug(
          `Extended RedLock for key '${lockKey}' on ${extended.length} clients`,
        );

        return extended.length >= quorum;
      };

      const refresh = async (): Promise<boolean> => {
        const refreshed = await executeScriptAcrossClients({
          clients: solidisClients,
          scriptHash: scriptHashes.refresh,
          keys: [lockKey],
          parameters: [lockValue, lockTimeout.toString()],
          logger,
        });

        logger?.debug(
          `Refreshed RedLock for key '${lockKey}' on ${refreshed.length} clients`,
        );

        return refreshed.length >= quorum;
      };

      const unlock = async (): Promise<boolean> => {
        const released = await executeScriptAcrossClients({
          clients: solidisClients,
          scriptHash: scriptHashes.release,
          keys: [lockKey],
          parameters: [lockValue],
          logger,
        });

        logger?.debug(
          `Released RedLock for key '${lockKey}' on ${released.length} clients`,
        );

        return released.length >= quorum;
      };

      const getRemainingTime = () => Math.max(expiryTimestamp - Date.now(), 0);

      return {
        getRemainingTime,
        extend,
        refresh,
        unlock,
      };
    }

    await executeScriptAcrossClients({
      clients: solidisClients,
      scriptHash: scriptHashes.release,
      keys: [lockKey],
      parameters: [lockValue],
      logger,
    });

    if (attempt < retryCount - 1) {
      await timeout(retryDelay);
    }
  }

  throw new Error('Failed to acquire RedLock');
}
