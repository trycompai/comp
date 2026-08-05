import { registerFromDirectory, schedules } from '@trigger.dev/sdk';

let initialized = false;

/**
 * Registers every task + schedule with the local in-process @trigger.dev shim.
 * Task modules self-register as a side effect of being required.
 */
export function initLocalTriggerRuntime(): void {
  if (initialized) return;
  initialized = true;

  registerFromDirectory(__dirname, {
    ignore: [/\.(spec|test)\.js$/, /register-local-triggers\.js$/],
  });
  schedules.start();
}
