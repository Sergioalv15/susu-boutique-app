export class DatabaseUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

export interface DatabaseOperationCoordinator {
  run<T>(operation: () => Promise<T>): Promise<T>;
  generation(): number;
  advanceGeneration(): void;
  subscribeGeneration(listener: (generation: number) => void): () => void;
  block(reason: string): void;
}

export function createDatabaseOperationCoordinator(): DatabaseOperationCoordinator {
  let tail = Promise.resolve();
  let blockedReason: string | null = null;
  let generation = 0;
  const listeners = new Set<(nextGeneration: number) => void>();

  return {
    async run<T>(operation: () => Promise<T>): Promise<T> {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });

      await previous;

      if (blockedReason) {
        release();
        throw new DatabaseUnavailableError(blockedReason);
      }

      try {
        return await operation();
      } finally {
        release();
      }
    },
    generation() {
      return generation;
    },
    advanceGeneration() {
      generation += 1;
      for (const listener of listeners) {
        listener(generation);
      }
    },
    subscribeGeneration(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    block(reason) {
      blockedReason = reason;
    },
  };
}

const coordinator = createDatabaseOperationCoordinator();

export function runDatabaseOperation<T>(operation: () => Promise<T>): Promise<T> {
  return coordinator.run(operation);
}

export function getDatabaseGeneration(): number {
  return coordinator.generation();
}

export function advanceDatabaseGeneration(): void {
  coordinator.advanceGeneration();
}

export function subscribeDatabaseGeneration(listener: (generation: number) => void): () => void {
  return coordinator.subscribeGeneration(listener);
}

export function blockDatabaseOperations(reason: string): void {
  coordinator.block(reason);
}
