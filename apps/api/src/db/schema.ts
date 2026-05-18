import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const ts = () =>
  text('timestamp').default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`).notNull();

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    avatarUrl: text('avatar_url'),
    emailVerifiedAt: text('email_verified_at'),
    createdAt: ts(),
    updatedAt: ts(),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
  }),
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    createdAt: ts(),
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId),
    expiresIdx: index('sessions_expires_idx').on(t.expiresAt),
  }),
);

export const workspaces = sqliteTable(
  'workspaces',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ownerId: text('owner_id').notNull().references(() => users.id),
    plan: text('plan').notNull().default('free'),
    createdAt: ts(),
    updatedAt: ts(),
  },
  (t) => ({
    slugIdx: uniqueIndex('workspaces_slug_idx').on(t.slug),
    ownerIdx: index('workspaces_owner_idx').on(t.ownerId),
  }),
);

export const workspaceMembers = sqliteTable(
  'workspace_members',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    invitedEmail: text('invited_email'),
    inviteStatus: text('invite_status').notNull().default('accepted'),
    role: text('role').notNull().default('viewer'),
    createdAt: ts(),
  },
  (t) => ({
    wsIdx: index('ws_members_ws_idx').on(t.workspaceId),
    userIdx: index('ws_members_user_idx').on(t.userId),
    uniq: uniqueIndex('ws_members_unique').on(t.workspaceId, t.userId),
  }),
);

export const campaigns = sqliteTable(
  'campaigns',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    folderId: text('folder_id'),
    tags: text('tags'),
    createdAt: ts(),
    updatedAt: ts(),
  },
  (t) => ({
    wsIdx: index('campaigns_ws_idx').on(t.workspaceId),
  }),
);

export const qrCodes = sqliteTable(
  'qr_codes',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    shortCode: text('short_code').notNull(),
    type: text('type').notNull(),
    status: text('status').notNull().default('active'),
    destinationUrl: text('destination_url').notNull(),
    fallbackUrl: text('fallback_url'),
    destinationPayload: text('destination_payload'),
    designJson: text('design_json'),
    redirectRulesJson: text('redirect_rules_json'),
    passwordHash: text('password_hash'),
    scanLimit: integer('scan_limit'),
    scanCountTotal: integer('scan_count_total').notNull().default(0),
    expiresAt: text('expires_at'),
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: ts(),
    updatedAt: ts(),
    deletedAt: text('deleted_at'),
  },
  (t) => ({
    shortCodeIdx: uniqueIndex('qr_codes_short_code_idx').on(t.shortCode),
    workspaceIdx: index('qr_codes_workspace_idx').on(t.workspaceId),
    campaignIdx: index('qr_codes_campaign_idx').on(t.campaignId),
    statusIdx: index('qr_codes_status_idx').on(t.status),
  }),
);

export const qrVersions = sqliteTable(
  'qr_versions',
  {
    id: text('id').primaryKey(),
    qrCodeId: text('qr_code_id').notNull().references(() => qrCodes.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    destinationUrl: text('destination_url').notNull(),
    destinationPayload: text('destination_payload'),
    designJson: text('design_json'),
    redirectRulesJson: text('redirect_rules_json'),
    changeNote: text('change_note'),
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: ts(),
  },
  (t) => ({
    qrIdx: index('qr_versions_qr_idx').on(t.qrCodeId),
  }),
);

export const scanEvents = sqliteTable(
  'scan_events',
  {
    id: text('id').primaryKey(),
    qrCodeId: text('qr_code_id').notNull().references(() => qrCodes.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    timestamp: ts(),
    ipHash: text('ip_hash'),
    country: text('country'),
    city: text('city'),
    region: text('region'),
    userAgent: text('user_agent'),
    deviceType: text('device_type'),
    os: text('os'),
    browser: text('browser'),
    referrer: text('referrer'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    language: text('language'),
    isUnique: integer('is_unique', { mode: 'boolean' }).notNull().default(false),
    isBot: integer('is_bot', { mode: 'boolean' }).notNull().default(false),
    ruleMatched: text('rule_matched'),
    redirectedTo: text('redirected_to'),
    responseTimeMs: integer('response_time_ms'),
  },
  (t) => ({
    qrIdx: index('scan_events_qr_idx').on(t.qrCodeId),
    wsIdx: index('scan_events_ws_idx').on(t.workspaceId),
    tsIdx: index('scan_events_ts_idx').on(t.timestamp),
    qrTsIdx: index('scan_events_qr_ts_idx').on(t.qrCodeId, t.timestamp),
  }),
);

export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    scopes: text('scopes').notNull().default('qr:read,qr:write,analytics:read'),
    lastUsedAt: text('last_used_at'),
    createdAt: ts(),
    revokedAt: text('revoked_at'),
  },
  (t) => ({
    wsIdx: index('api_keys_ws_idx').on(t.workspaceId),
    hashIdx: uniqueIndex('api_keys_hash_idx').on(t.keyHash),
  }),
);

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    metadata: text('metadata'),
    ipHash: text('ip_hash'),
    createdAt: ts(),
  },
  (t) => ({
    wsIdx: index('audit_logs_ws_idx').on(t.workspaceId),
    entityIdx: index('audit_logs_entity_idx').on(t.entityType, t.entityId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
export type ScanEvent = typeof scanEvents.$inferSelect;
