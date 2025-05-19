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

  const { logger, maxAttempts = 100, retryInterval = 50 } = options ?? {};

  let attempts = 0;

  while (attempts < maxAttempts) {
    const acquired = await this.set(key, '1', {
      expireInMilliseconds: maxAttempts * retryInterval * 2,
      setIfKeyNotExists: true,
    });

    if (acquired) {
      logger?.debug(`Acquired lock for key '${key}'`);

      return {
        unlock: async () => {
          try {
            await this.del(key);

            logger?.debug(`Unlocked key '${key}'`);
          } catch (error) {
            logger?.debug(`Failed to unlock for key '${key}'`, error);
          }
        },
      };
    }

    await timeout(retryInterval);

    attempts += 1;
  }

  throw new Error('Failed to acquire lock');
}
