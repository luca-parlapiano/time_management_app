

export type LoadingMode = 'blocking' | 'local' | 'silent';

export interface LoadingOptions { mode?: LoadingMode; scope?: string; message?: string }

export interface LoadingEntry { id: number; mode: LoadingMode; scope: string; message: string }

export interface LoadingContextValue {
  pending: number;
  blocking: boolean;
  isLoading(scope?: string): boolean;
  start(options?: LoadingOptions): () => void;
  run<T>(operation: () => Promise<T>, options?: LoadingOptions): Promise<T>;
}
