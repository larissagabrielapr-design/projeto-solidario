import type { PostgresDatabase } from './adapter.mjs';
export const localDatabase: PostgresDatabase;
export function getLocalResources(): Promise<{ DB: PostgresDatabase; FILES: unknown; dispose: () => Promise<void> }>;
