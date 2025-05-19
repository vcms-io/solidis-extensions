<p align="center" width="100%">
  <img src="https://resources.vcms.io/assets/solidis.png" alt="Solidis" width="300"/>
</p>

<h1 align="center">RedLock</h1>

<p align="center">
  <b>Fault-tolerant distributed mutex based on the Redlock algorithm</b>
</p>

<p align="center">
  <a href="../../..">Back to @vcms-io/solidis-extensions</a>
</p>

## 🔍 Overview

`redLock()` implements [Redis' Redlock algorithm](https://redis.io/docs/latest/develop/use/patterns/distributed-locks/#the-redlock-algorithm)
to provide a **distributed** mutual-exclusion lock that spans multiple Redis instances.
It guarantees safety as long as a majority (quorum) of your instances remain available.

> **Note**
> Unlike `spinLock`, **RedLock is <em>not</em> a command extension**.
> It is a standalone helper you import from `@vcms-io/solidis-extensions` and invoke with an array of `SolidisClient` (or `SolidisFeaturedClient`) instances.

### Caveats

* Requires **at least 3** separate Redis nodes for fault-tolerance.
* Ensure system clocks of Redis instances are reasonably synchronized.
* If the lock expires before your critical section ends, your operation may run concurrently elsewhere—always keep lock TTL > expected job duration.

## 💡 Usage

### With Basic Clients

```typescript
import { SolidisClient } from '@vcms-io/solidis';
import { set, get, del, scriptLoad, scriptExists, evalsha, eval as evaluate } from '@vcms-io/solidis/command';
import { redLock } from '@vcms-io/solidis-extensions';

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

const uris = [
  'redis://localhost:6379',
  'redis://localhost:6380',
  'redis://localhost:6381',
];

const clients = uris.map((uri) => new SolidisClient({ uri }).extend(extensions));

// Acquire a distributed lock covering all three clients
const {
  getRemainingTime,
  extend,
  refresh,
  unlock,
} = await redLock(clients, 'invoice:123', {
  lockTimeout: 1000,   // milliseconds
  retryCount: 3,
  retryDelay: 200,     // milliseconds
  logger: console,
});

// do some work exclusively …

await extend(1000);    // add 1 second
await refresh();       // refresh TTL without changing value
await unlock();        // release lock on quorum
```

### With Featured Clients

`SolidisFeaturedClient` already includes common Redis commands, so no additional extensions are required—simply pass the clients array to `redLock()`.

```typescript
import { SolidisFeaturedClient } from '@vcms-io/solidis/featured';
import { redLock } from '@vcms-io/solidis-extensions';

const uris = [
  'redis://localhost:6379',
  'redis://localhost:6380',
  'redis://localhost:6381',
];

const clients = uris.map((uri) => new SolidisFeaturedClient({ uri }));

const { unlock } = await redLock(clients, 'feature:example');

// ... critical section ...

await unlock();
```

#### Return Value

`redLock()` resolves to an object with:

| Property             | Type               | Description                                                               |
| -------------------- | ------------------ | ------------------------------------------------------------------------- |
| `getRemainingTime()` | `() => number`     | Returns milliseconds until the lock expires (0 when already expired)      |
| `extend(ttl)`        | `Promise<boolean>` | Attempts to add **ttl** ms to the lock; succeeds only when quorum reached |
| `refresh()`          | `Promise<boolean>` | Renews the TTL with the original value                                    |
| `unlock()`           | `Promise<boolean>` | Releases the lock; succeeds only when quorum reached                      |

#### Options

| Name          | Type                                    | Default     | Description                            |
| ------------- | --------------------------------------- | ----------- | -------------------------------------- |
| `lockTimeout` | `number`                                | `10000`     | TTL in milliseconds                    |
| `retryCount`  | `number`                                | `3`         | Number of acquire attempts             |
| `retryDelay`  | `number`                                | `200`       | Delay between retries (ms)             |
| `driftFactor` | `number`                                | `0.01`      | Clock drift factor (see RedLock paper) |
| `prefix`      | `string`                                | `'redLock'` | Key prefix                             |
| `logger`      | `{ debug: (...parameters) => unknown }` | `undefined` | Inject custom logger                   |

## 📄 License

Licensed under the MIT.
