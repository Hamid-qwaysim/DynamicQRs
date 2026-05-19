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
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
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

export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: ts(),
  },
  (t) => ({
    tokenIdx: uniqueIndex('prt_token_hash_idx').on(t.tokenHash),
    userIdx: index('prt_user_idx').on(t.userId),
  }),
);

export const emailVerificationTokens = sqliteTable(
  'email_verification_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    email: text('email').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: ts(),
  },
  (t) => ({
    tokenIdx: uniqueIndex('evt_token_hash_idx').on(t.tokenHash),
    userIdx: index('evt_user_idx').on(t.userId),
  }),
);

export const customDomains = sqliteTable(
  'custom_domains',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(),
    status: text('status').notNull().default('pending'),
    dnsTarget: text('dns_target').notNull(),
    verificationToken: text('verification_token'),
    sslStatus: text('ssl_status').notNull().default('pending'),
    createdAt: ts(),
    verifiedAt: text('verified_at'),
  },
  (t) => ({
    domainIdx: uniqueIndex('custom_domains_domain_idx').on(t.domain),
    wsIdx: index('custom_domains_ws_idx').on(t.workspaceId),
  }),
);

export const workspaceInvites = sqliteTable(
  'workspace_invites',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull().default('viewer'),
    tokenHash: text('token_hash').notNull(),
    invitedBy: text('invited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(),
    acceptedAt: text('accepted_at'),
    createdAt: ts(),
  },
  (t) => ({
    tokenIdx: uniqueIndex('invites_token_idx').on(t.tokenHash),
    wsIdx: index('invites_ws_idx').on(t.workspaceId),
    emailIdx: index('invites_email_idx').on(t.email),
  }),
);

export const bulkJobs = sqliteTable(
  'bulk_jobs',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    totalRows: integer('total_rows').notNull().default(0),
    successCount: integer('success_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    resultJson: text('result_json'),
    errorJson: text('error_json'),
    createdAt: ts(),
    completedAt: text('completed_at'),
  },
  (t) => ({
    wsIdx: index('bulk_jobs_ws_idx').on(t.workspaceId),
    statusIdx: index('bulk_jobs_status_idx').on(t.status),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
export type ScanEvent = typeof scanEvents.$inferSelect;
