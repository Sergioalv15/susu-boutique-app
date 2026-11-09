export interface LatestWins {
  begin(): number;
  isCurrent(epoch: number): boolean;
  invalidate(): void;
}

export interface LatestAsyncLoadCallbacks<T> {
  onStart(): void;
  onSuccess(value: T): void;
  onError(error: unknown): void;
}

export interface LatestAsyncLoadCoordinator {
  run<T>(
    load: () => Promise<T>,
    callbacks: LatestAsyncLoadCallbacks<T>,
  ): Promise<void>;
  invalidate(): void;
}

export function createLatestWins(): LatestWins {
  let current = 0;

  return {
    begin() {
      current += 1;
      return current;
    },
    isCurrent(epoch) {
      return epoch === current;
    },
    invalidate() {
      current += 1;
    },
  };
}

export function createLatestAsyncLoadCoordinator(): LatestAsyncLoadCoordinator {
  const latest = createLatestWins();

  return {
    async run<T>(
      load: () => Promise<T>,
      { onStart, onSuccess, onError }: LatestAsyncLoadCallbacks<T>,
    ): Promise<void> {
      const epoch = latest.begin();
      onStart();

      try {
        const result = await load();
        if (latest.isCurrent(epoch)) {
          onSuccess(result);
        }
      } catch (error) {
        if (latest.isCurrent(epoch)) {
          onError(error);
        }
      }
    },
    invalidate() {
      latest.invalidate();
    },
  };
}
