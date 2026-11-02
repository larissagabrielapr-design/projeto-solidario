import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const key = Symbol.for('ibpv.local-cloudflare');
export async function getLocalResources() {
  if (process.env.NODE_ENV === 'production') throw new Error('Miniflare é exclusivo do desenvolvimento local.');
  return globalThis[key] ??= (async () => {
    const root = path.resolve('.wrangler/state');
    const mf = new Miniflare({
      modules: true,
      script: await readFile(path.resolve('scripts/local-debug-worker.mjs'), 'utf8'),
      host: '127.0.0.1',
      port: process.env.LOCAL_CF_TEST === '1' ? 0 : 8787,
      d1Databases: { DB: 'ibpv-solidario-local' },
      d1Persist: path.join(root, 'd1'),
      r2Buckets: { FILES: 'ibpv-solidario-files-local' },
      r2Persist: path.join(root, 'r2'),
    });
    try {
      const DB = await mf.getD1Database('DB');
      const FILES = await mf.getR2Bucket('FILES');
      const schema = await readFile(path.resolve('db/d1/0001_initial.sql'), 'utf8');
      await DB.batch(schema.split(';').map(s => s.trim()).filter(Boolean).map(s => DB.prepare(s)));
      return { DB, FILES, dispose: () => mf.dispose() };
    } catch (error) { await mf.dispose(); delete globalThis[key]; throw error; }
  })();
}

class LocalStatement {
  constructor(sql, values = []) { this.sql = sql; this.values = values; }
  bind(...values) { return new LocalStatement(this.sql, values); }
  async resolve() { const { DB } = await getLocalResources(); return DB.prepare(this.sql).bind(...this.values); }
  async first(...args) { return (await this.resolve()).first(...args); }
  async all() { return (await this.resolve()).all(); }
  async run() { return (await this.resolve()).run(); }
}
export const localDatabase = {
  prepare(sql) { return new LocalStatement(sql); },
  async batch(statements) {
    const { DB } = await getLocalResources();
    return DB.batch(await Promise.all(statements.map(s => s.resolve())));
  },
};
