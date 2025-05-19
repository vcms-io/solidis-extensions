import type { SolidisClient, SolidisClientExtensions } from '@vcms-io/solidis';
import type { del } from '@vcms-io/solidis/command/del';
import type { evaluate } from '@vcms-io/solidis/command/eval';
import type { evalsha } from '@vcms-io/solidis/command/evalsha';
import type { get } from '@vcms-io/solidis/command/get';
import type { scriptExists } from '@vcms-io/solidis/command/script.exists';
import type { scriptLoad } from '@vcms-io/solidis/command/script.load';
import type { set } from '@vcms-io/solidis/command/set';

export type SolidisExtendedClient = SolidisClient &
  SolidisClientExtensions<{
    set: typeof set;
    del: typeof del;
    get: typeof get;
    evalsha: typeof evalsha;
    eval: typeof evaluate;
    scriptLoad: typeof scriptLoad;
    scriptExists: typeof scriptExists;
  }>;

export interface ExecuteScriptAcrossClientsOptions {
  clients: SolidisExtendedClient[];
  scriptHash: string;
  keys: string[];
  parameters: string[];
  logger?: Logger;
}

export interface CheckAndLoadScriptOptions {
  client: SolidisExtendedClient;
  name: ScriptName;
  script: string;
  sha1: string;
  logger?: Logger;
}

export interface ScriptHashes {
  acquire: string;
  release: string;
  extend: string;
  refresh: string;
}

export type ScriptName = keyof ScriptHashes;

export interface Logger {
  debug: (...parameters: unknown[]) => unknown;
}

export interface RedLockOptions {
  logger?: Logger;
  lockTimeout?: number;
  retryCount?: number;
  retryDelay?: number;
  driftFactor?: number;
  prefix?: string;
}

export interface Lock {
  getRemainingTime: () => number;
  extend: (extensionTime: number) => Promise<boolean>;
  refresh: () => Promise<boolean>;
  unlock: () => Promise<boolean>;
}
