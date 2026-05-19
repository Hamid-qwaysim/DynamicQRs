const API_BASE =
  (import.meta.env.VITE_API_URL as string) || 'https://qr.dynamicqrcodelabs.com';

export class ApiError extends Error {
  constructor(public status: number, public body: any, message: string) {
    super(message);
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const opts: RequestInit = {
    method,
    credentials: 'include',
    headers: { Accept: 'application/json' },
  };
  if (body !== undefined) {
    (opts.headers as Record<string, string>)['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + path, opts);
  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    throw new ApiError(res.status, parsed, parsed?.error || res.statusText);
  }
  return parsed as T;
}

export const api = {
  apiBase: API_BASE,

  // Auth
  signup: (data: { name: string; email: string; password: string }) =>
    request<{ user: User; workspace: Workspace }>('POST', '/api/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    request<{ user: User }>('POST', '/api/auth/login', data),
  logout: () => request<{ ok: boolean }>('POST', '/api/auth/logout'),
  me: () => request<{ user: User | null }>('GET', '/api/auth/me'),

  // Password reset
  requestPasswordReset: (email: string) =>
    request<{ ok: boolean; devToken?: string }>('POST', '/api/auth/password/request', { email }),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>('POST', '/api/auth/password/reset', { token, password }),

  // Email verification
  sendVerificationEmail: () =>
    request<{ ok: boolean; alreadyVerified?: boolean; devToken?: string }>(
      'POST',
      '/api/auth/email/send',
    ),
  confirmEmail: (token: string) =>
    request<{ ok: boolean }>('POST', '/api/auth/email/confirm', { token }),

  // QR Codes
  listQrCodes: () => request<{ qrCodes: QrCode[] }>('GET', '/api/qr-codes'),
  createQr: (data: CreateQrInput) =>
    request<{ qrCode: QrCode }>('POST', '/api/qr-codes', data),
  getQr: (id: string) => request<{ qrCode: QrCode }>('GET', `/api/qr-codes/${id}`),
  updateQr: (id: string, data: Partial<CreateQrInput> & { status?: string; changeNote?: string }) =>
    request<{ ok: boolean }>('PATCH', `/api/qr-codes/${id}`, data),
  pauseQr: (id: string) => request<{ ok: boolean }>('POST', `/api/qr-codes/${id}/pause`),
  resumeQr: (id: string) => request<{ ok: boolean }>('POST', `/api/qr-codes/${id}/resume`),
  revokeQr: (id: string) => request<{ ok: boolean }>('POST', `/api/qr-codes/${id}/revoke`),
  deleteQr: (id: string) => request<{ ok: boolean }>('DELETE', `/api/qr-codes/${id}`),
  qrAnalytics: (id: string) =>
    request<QrAnalytics>('GET', `/api/qr-codes/${id}/analytics`),

  // Domains
  listDomains: () => request<{ domains: CustomDomain[] }>('GET', '/api/domains'),
  addDomain: (domain: string) =>
    request<{ domain: CustomDomain & { instructions: string[] } }>('POST', '/api/domains', { domain }),
  verifyDomain: (id: string) =>
    request<{ verified: boolean; resolvedTarget?: string }>('POST', `/api/domains/${id}/verify`),
  deleteDomain: (id: string) => request<{ ok: boolean }>('DELETE', `/api/domains/${id}`),

  // Team
  getWorkspace: () => request<{ workspace: Workspace | null }>('GET', '/api/team/workspace'),
  listMembers: () =>
    request<{ members: WorkspaceMember[]; currentUserRole: string }>('GET', '/api/team/members'),
  listInvites: () => request<{ invites: Invite[] }>('GET', '/api/team/invites'),
  inviteMember: (email: string, role: 'admin' | 'editor' | 'viewer') =>
    request<{ ok: boolean; devToken?: string }>('POST', '/api/team/invites', { email, role }),
  deleteInvite: (id: string) => request<{ ok: boolean }>('DELETE', `/api/team/invites/${id}`),
  updateMemberRole: (id: string, role: 'admin' | 'editor' | 'viewer') =>
    request<{ ok: boolean }>('PATCH', `/api/team/members/${id}`, { role }),
  removeMember: (id: string) => request<{ ok: boolean }>('DELETE', `/api/team/members/${id}`),

  // Bulk
  listBulkJobs: () => request<{ jobs: BulkJob[] }>('GET', '/api/bulk'),
  getBulkJob: (id: string) => request<{ job: BulkJob & { resultJson: any; errorJson: any } }>(
    'GET',
    `/api/bulk/${id}`,
  ),
  submitBulkJob: (rows: any[]) =>
    request<{ jobId: string; successCount: number; failedCount: number; results: any[] }>(
      'POST',
      '/api/bulk',
      { rows },
    ),

  // QR render
  qrRenderUrl: (id: string, format: 'svg' | 'png' = 'svg', size = 1024) =>
    `${API_BASE}/api/qr-codes/${id}/render?format=${format}&size=${size}`,
};

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role?: string;
}

export interface QrCode {
  id: string;
  workspaceId: string;
  campaignId?: string | null;
  name: string;
  shortCode: string;
  shortUrl: string;
  type: string;
  status: 'active' | 'paused' | 'revoked' | 'archived';
  destinationUrl: string;
  fallbackUrl?: string | null;
  designJson?: Record<string, unknown> | null;
  redirectRulesJson?: Array<unknown> | null;
  scanLimit?: number | null;
  scanCountTotal: number;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQrInput {
  name: string;
  type: string;
  destinationUrl: string;
  fallbackUrl?: string;
  customSlug?: string;
  designJson?: Record<string, unknown>;
  redirectRulesJson?: any[];
  expiresAt?: string;
  scanLimit?: number;
}

export interface QrAnalytics {
  totals: { total: number; bots: number };
  recentScans: Array<{
    id: string;
    timestamp: string;
    country: string | null;
    deviceType: string | null;
    os: string | null;
    browser: string | null;
  }>;
  byCountry: Array<{ country: string | null; count: number }>;
  byDevice: Array<{ device: string | null; count: number }>;
}

export interface CustomDomain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  dnsTarget: string;
  sslStatus: string;
  createdAt: string;
  verifiedAt?: string | null;
}

export interface WorkspaceMember {
  id: string;
  userId: string | null;
  role: string;
  inviteStatus: string;
  name: string | null;
  email: string | null;
  joinedAt: string;
}

export interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface BulkJob {
  id: string;
  status: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
}
