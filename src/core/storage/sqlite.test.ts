import { describe, expect, it } from 'vitest';
import { DatabaseUnavailableError, createDatabaseOperationCoordinator } from './databaseCoordinator';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('createDatabaseOperationCoordinator', () => {
  it('runs database work in FIFO order and continues after a rejected operation', async () => {
    const coordinator = createDatabaseOperationCoordinator();
    const first = deferred<void>();
    const events: string[] = [];

    const firstOperation = coordinator.run(async () => {
      events.push('first-start');
      await first.promise;
      events.push('first-end');
    });
    const rejected = coordinator.run(async () => {
      events.push('rejected');
      throw new Error('expected');
    });
    const finalOperation = coordinator.run(async () => {
      events.push('final');
    });

    first.resolve();
    await firstOperation;
    await expect(rejected).rejects.toThrow('expected');
    await finalOperation;

    expect(events).toEqual(['first-start', 'first-end', 'rejected', 'final']);
  });

  it('notifies generation consumers and blocks work only after recovery failure', async () => {
    const coordinator = createDatabaseOperationCoordinator();
    const generations: number[] = [];
    const unsubscribe = coordinator.subscribeGeneration((generation) => generations.push(generation));

    coordinator.advanceGeneration();
    unsubscribe();
    coordinator.advanceGeneration();
    coordinator.block('recovery failed');

    await expect(coordinator.run(async () => undefined)).rejects.toBeInstanceOf(DatabaseUnavailableError);
    expect(generations).toEqual([1]);
  });
});
