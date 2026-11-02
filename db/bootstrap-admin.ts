import { startState } from '../app/lib/domain';
import { normalizeEmail, randomToken, SCRYPT } from '../app/lib/password-crypto';
import { scrypt } from 'node:crypto';
import type { PostgresDatabase } from './adapter.mjs';

export async function bootstrapAdmin(db: PostgresDatabase, production?: {ADMIN_EMAIL?:string;ADMIN_PASS?:string}) {
  if (process.env.NODE_ENV !== 'development' && !production) return;
  const rawEmail = production?.ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? process.env.admin_email;
  const rawPassword = production?.ADMIN_PASS ?? process.env.ADMIN_PASS ?? process.env.admin_pass;
  if (!rawEmail && !rawPassword) return;
  if (!rawEmail || !rawPassword) throw new Error('Configure ADMIN_EMAIL e ADMIN_PASS juntos no .env.');
  // Bootstrap only an empty installation: never replace existing accounts or permissions.
  if (await db.prepare('SELECT id FROM project_state WHERE id=1').first()) return;
  if (await db.prepare('SELECT id FROM auth_credentials LIMIT 1').first()) {
    throw new Error('Existem contas locais sem projeto. O administrador não foi criado para preservar os dados.');
  }
  const email = normalizeEmail(rawEmail), password = rawPassword;
  if (password.length > 128) throw new Error('ADMIN_PASS deve ter no máximo 128 caracteres.');
  if (production && password.length < 12) throw new Error('ADMIN_PASS de produção precisa ter pelo menos 12 caracteres.');
  const id = crypto.randomUUID(), principal = 'password:' + id;
  // Explicitly configured local bootstrap may use short development credentials.
  // Public registration and password changes retain the normal password policy.
  const salt = randomToken();
  const passwordHash = await new Promise<string>((resolve, reject) =>
    scrypt(password, salt, 64, SCRYPT, (error, key) => error ? reject(error) : resolve(key.toString('hex'))));
  const state = startState({ userId: principal, displayName: 'Administração', email });
  await db.batch([
    db.prepare('INSERT INTO project_state(id,revision,payload) VALUES(1,0,?)').bind(JSON.stringify(state)),
    db.prepare('INSERT INTO auth_credentials(id,email,name,principal,password_hash,salt,version,blocked,created_at) VALUES(?,?,?,?,?,?,1,0,?)')
      .bind(id, email, 'Administração', principal, passwordHash, salt, new Date().toISOString()),
  ]);
  console.log('Administrador local criado. Entre pela tela de acesso com as credenciais do .env.');
}
