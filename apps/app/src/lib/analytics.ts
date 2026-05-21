// Lightweight GA4 wrapper that no-ops when GA4 isn't configured
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    __GA4_ID__?: string;
  }
}

const enabled = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.gtag === 'function' &&
  !!window.__GA4_ID__ &&
  !window.__GA4_ID__.startsWith('%');

export function trackPageview(path: string): void {
  if (!enabled() || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!enabled() || !window.gtag) return;
  window.gtag('event', name, params);
}

export const events = {
  signupCompleted: () => trackEvent('sign_up', { method: 'email' }),
  loginCompleted: () => trackEvent('login', { method: 'email' }),
  qrCreated: (type: string) => trackEvent('qr_created', { qr_type: type }),
  qrDestinationEdited: (type: string) => trackEvent('qr_destination_edited', { qr_type: type }),
  qrDownloaded: (format: string) => trackEvent('qr_downloaded', { format }),
  qrDesignSaved: () => trackEvent('qr_design_saved'),
  domainAdded: () => trackEvent('custom_domain_added'),
  inviteSent: () => trackEvent('team_invite_sent'),
  bulkJobSubmitted: (rows: number) => trackEvent('bulk_job_submitted', { rows }),
  upgradeStarted: (plan: string) => trackEvent('begin_checkout', { plan, currency: 'USD' }),
  upgradeCompleted: (plan: string) => trackEvent('purchase', { plan, currency: 'USD' }),
};
