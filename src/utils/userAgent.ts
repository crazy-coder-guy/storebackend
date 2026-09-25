export interface ParsedUserAgent {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string | null;
  browser: string | null;
}

export function parseUserAgent(ua: string): ParsedUserAgent {
  const s = ua || '';

  let deviceType: ParsedUserAgent['deviceType'] = 'desktop';
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(s)) deviceType = 'tablet';
  else if (/Mobi|iPhone|iPod|Android/i.test(s)) deviceType = 'mobile';

  // iOS UAs always include a "like Mac OS X" compatibility string, so that
  // check must come before the generic macOS one or every iPhone/iPad
  // misreports as a Mac.
  let os: string | null = null;
  if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
  else if (/Windows NT 10/i.test(s)) os = 'Windows 10/11';
  else if (/Windows NT/i.test(s)) os = 'Windows';
  else if (/Mac OS X/i.test(s)) os = 'macOS';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/Linux/i.test(s)) os = 'Linux';

  let browser: string | null = null;
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/OPR\//i.test(s) || /Opera/i.test(s)) browser = 'Opera';
  else if (/CriOS\//i.test(s)) browser = 'Chrome (iOS)';
  else if (/FxiOS\//i.test(s)) browser = 'Firefox (iOS)';
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = 'Chrome';
  else if (/Firefox\//i.test(s)) browser = 'Firefox';
  else if (/Safari\//i.test(s) && /Version\//i.test(s)) browser = 'Safari';
  else if (/MSIE|Trident/i.test(s)) browser = 'Internet Explorer';

  return { deviceType, os, browser };
}
