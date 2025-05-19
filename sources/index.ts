import { SolidisCommandError } from '@vcms-io/solidis';

import { timeout } from './common/utils.ts';

import type { SolidisClientExtensions } from '@vcms-io/solidis';
import type { del } from '@vcms-io/solidis/command/del';
import type { set } from '@vcms-io/solidis/command/set';

export async function spinLock(
  this: SolidisClientExtensions<{ set: typeof set; del: typeof del }>,
  key: string,
  options?: {
    logger?: { debug: (...parameters: unknown[]) => unknown };
    maxAttempts?: number;
    retryInterval?: number;
    prefix?: string;
  },
) {
  if (
    !this.set ||
    !this.del ||
    typeof this.set !== 'function' ||
    typeof this.del !== 'function'
  ) {
    throw new SolidisCommandError(
      'You should extend client with set and del commands',
    );
  }

  const {
    logger,
    maxAttempts = 100,
    retryInterval = 50,
    prefix = 'lock',
  } = options ?? {};

  const lockKey = `${prefix ? `${prefix}:` : ''}${key}`;

  let attempts = 0;

  while (attempts < maxAttempts) {
    const acquired = await this.set(lockKey, '1', {
      expireInMilliseconds: maxAttempts * retryInterval * 2,
      setIfKeyNotExists: true,
    });

    if (acquired) {
      logger?.debug(`Acquired lock for key '${lockKey}'`);

      return {
        unlock: async () => {
          try {
            await this.del(lockKey);

            logger?.debug(`Unlocked key '${lockKey}'`);
          } catch (error) {
            logger?.debug(`Failed to unlock for key '${lockKey}'`, error);
          }
        },
      };
    }

    await timeout(retryInterval);

    attempts += 1;
  }

  throw new Error('Failed to acquire lock');
}
