import assert from 'node:assert/strict';
import { getLocalResources } from '../db/local.mjs';
process.env.LOCAL_CF_TEST = '1';
const resources = await getLocalResources();
try {
  const { DB, FILES } = resources;
  assert.equal((await DB.prepare('SELECT count(*) AS n FROM project_state').first()).n >= 0, true);
  await assert.rejects(DB.batch([
    DB.prepare("INSERT INTO migration_imports VALUES ('local-rollback-check', 'test')"),
    DB.prepare('INSERT INTO missing_table VALUES (1)'),
  ]));
  assert.equal(await DB.prepare("SELECT * FROM migration_imports WHERE checksum='local-rollback-check'").first(), null);
  const key = `checks/${crypto.randomUUID()}`;
  try { await FILES.put(key, 'ok'); assert.equal(await (await FILES.get(key)).text(), 'ok'); }
  finally { await FILES.delete(key); }
  console.log('D1: esquema e rollback OK. R2: escrita, leitura e exclusão OK.');
} finally { await resources.dispose(); }
