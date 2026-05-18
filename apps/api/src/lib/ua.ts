/**
 * Lightweight user-agent parser sized for Cloudflare Workers.
 * Returns coarse device type, OS family, and browser family.
 */

export interface ParsedUA {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv' | 'bot' | 'other';
  os: string;
  browser: string;
  isBot: boolean;
}

const BOT_RE = /bot|crawl|spider|slurp|baiduspider|bingpreview|facebookexternalhit|whatsapp|telegram|preview|monitor|http|fetch|prerender|lighthouse|headless|insomnia/i;

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) {
    return { deviceType: 'other', os: 'Unknown', browser: 'Unknown', isBot: false };
  }

  const isBot = BOT_RE.test(ua);

  let os = 'Unknown';
  if (/Windows NT 10/i.test(ua)) os = 'Windows';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/iPhone|iPad|iPod|iOS/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browser = 'Safari';

  let deviceType: ParsedUA['deviceType'] = 'desktop';
  if (isBot) deviceType = 'bot';
  else if (/iPad|Tablet/i.test(ua)) deviceType = 'tablet';
  else if (/Android|iPhone|iPod|Mobile/i.test(ua)) deviceType = 'mobile';
  else if (/SmartTV|HbbTV|AppleTV|GoogleTV/i.test(ua)) deviceType = 'tv';

  return { deviceType, os, browser, isBot };
}
