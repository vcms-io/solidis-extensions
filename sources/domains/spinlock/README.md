<p align="center" width="100%">
  <img src="https://resources.vcms.io/assets/solidis.png" alt="Solidis" width="300"/>
</p>

<h1 align="center">SpinLock</h1>

<p align="center">
  <b>A lightweight mutex implemented as a Solidis command extension</b>
</p>

<p align="center">
  <a href="../../../README.md">Back to @vcms-io/solidis-extensions</a>
</p>

## 🔍 Overview

SpinLock allows you to serialize concurrent tasks that target the same resource by leveraging Redis' atomic `SET key value NX PX ttl` command.
The implementation ships as a first-class Solidis <em>command extension</em> and therefore inherits Solidis' zero-dependency footprint.

## ⚙️ Requirements

• Same as [Solidis](https://github.com/vcms-io/solidis).

## 💡 Usage

### With Basic Client

Requires the client to be manually extended with `set` & `del` commands.

```typescript
import { SolidisClient } from '@vcms-io/solidis';
import { set } from '@vcms-io/solidis/command/set';
import { del } from '@vcms-io/solidis/command/del';
import { spinLock } from '@vcms-io/solidis-extensions';

import type { SolidisClientExtensions } from '@vcms-io/solidis';

const extensions = {
  set,
  del,
  spinLock,
} satisfies SolidisClientExtensions;

const client = new SolidisClient({
  host: 'localhost',
  port: 6379,
}).extend(extensions);

// All concurrent tasks will be serialized
const promises = Array.from({ length: 100 }).map(async () => {
  const { unlock } = await client.spinLock(`test`, {
    logger: console,
  });

  await unlock();
});

await Promise.all(promises);
```

### With Featured Client

```typescript
import { SolidisFeaturedClient } from '@vcms-io/solidis/featured';
import { spinLock } from '@vcms-io/solidis-extensions';

import type { SolidisClientExtensions } from '@vcms-io/solidis';

const extensions = {
  spinLock,
} satisfies SolidisClientExtensions;

const client = new SolidisFeaturedClient({
  host: 'localhost',
  port: 6379,
}).extend(extensions);

// All concurrent tasks will be serialized
const promises = Array.from({ length: 100 }).map(async () => {
  const { unlock } = await client.spinLock(`test`, {
    logger: console,
  });

  await unlock();
});

await Promise.all(promises);
```

#### Return Value

`spinLock()` resolves to an object with:

| Property   | Type                  | Description                                      |
| ---------- | --------------------- | ------------------------------------------------ |
| `unlock()` | `() => Promise<void>` | Releases the lock. No-op if lock already expired |

#### Options

| Name            | Type                              | Default  | Description                       |
| --------------- | --------------------------------- | -------- | --------------------------------- |
| `maxAttempts`   | `number`                          | `100`    | Maximum attempts before giving up |
| `retryInterval` | `number`                          | `50`     | Delay between attempts (ms)       |
| `prefix`        | `string`                          | `'lock'` | Key prefix                        |
| `logger`        | `{ debug: (...args) => unknown }` | —        | Optional logger                   |

## 📄 License

Licensed under the MIT.
