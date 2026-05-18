-- Initial schema for Dynamic QR Code Labs
-- Cloudflare D1 (SQLite) compatible

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  email_verified_at TEXT,
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL DEFAULT 'free',
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_idx ON workspaces (slug);
CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces (owner_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  invited_email TEXT,
  invite_status TEXT NOT NULL DEFAULT 'accepted',
  role TEXT NOT NULL DEFAULT 'viewer',
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS ws_members_ws_idx ON workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS ws_members_user_idx ON workspace_members (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ws_members_unique ON workspace_members (workspace_id, user_id);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  folder_id TEXT,
  tags TEXT,
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS campaigns_ws_idx ON campaigns (workspace_id);

CREATE TABLE IF NOT EXISTS qr_codes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  destination_url TEXT NOT NULL,
  fallback_url TEXT,
  destination_payload TEXT,
  design_json TEXT,
  redirect_rules_json TEXT,
  password_hash TEXT,
  scan_limit INTEGER,
  scan_count_total INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS qr_codes_short_code_idx ON qr_codes (short_code);
CREATE INDEX IF NOT EXISTS qr_codes_workspace_idx ON qr_codes (workspace_id);
CREATE INDEX IF NOT EXISTS qr_codes_campaign_idx ON qr_codes (campaign_id);
CREATE INDEX IF NOT EXISTS qr_codes_status_idx ON qr_codes (status);

CREATE TABLE IF NOT EXISTS qr_versions (
  id TEXT PRIMARY KEY,
  qr_code_id TEXT NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  destination_url TEXT NOT NULL,
  destination_payload TEXT,
  design_json TEXT,
  redirect_rules_json TEXT,
  change_note TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS qr_versions_qr_idx ON qr_versions (qr_code_id);

CREATE TABLE IF NOT EXISTS scan_events (
  id TEXT PRIMARY KEY,
  qr_code_id TEXT NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ip_hash TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  user_agent TEXT,
  device_type TEXT,
  os TEXT,
  browser TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  language TEXT,
  is_unique INTEGER NOT NULL DEFAULT 0,
  is_bot INTEGER NOT NULL DEFAULT 0,
  rule_matched TEXT,
  redirected_to TEXT,
  response_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS scan_events_qr_idx ON scan_events (qr_code_id);
CREATE INDEX IF NOT EXISTS scan_events_ws_idx ON scan_events (workspace_id);
CREATE INDEX IF NOT EXISTS scan_events_ts_idx ON scan_events (timestamp);
CREATE INDEX IF NOT EXISTS scan_events_qr_ts_idx ON scan_events (qr_code_id, timestamp);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT 'qr:read,qr:write,analytics:read',
  last_used_at TEXT,
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS api_keys_ws_idx ON api_keys (workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys (key_hash);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata TEXT,
  ip_hash TEXT,
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS audit_logs_ws_idx ON audit_logs (workspace_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
