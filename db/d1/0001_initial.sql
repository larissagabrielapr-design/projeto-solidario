CREATE TABLE IF NOT EXISTS project_state(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 0,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS auth_credentials(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,principal TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,salt TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,blocked INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS auth_sessions(token_hash TEXT PRIMARY KEY,credential_id TEXT NOT NULL,version INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_sessions_credential ON auth_sessions(credential_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS auth_limits(key TEXT PRIMARY KEY,hits INTEGER NOT NULL DEFAULT 1,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_reset_tokens(token_hash TEXT PRIMARY KEY,credential_id TEXT NOT NULL,expires_at INTEGER NOT NULL,claim TEXT);
CREATE TABLE IF NOT EXISTS migration_imports(checksum TEXT PRIMARY KEY,imported_at TEXT NOT NULL);
