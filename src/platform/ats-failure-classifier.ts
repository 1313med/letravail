/**
 * Classify why CUSTOM / UNKNOWN employers fail — persisted in ATS intelligence DB.
 */
export type InvestigationReason =
  | 'cloudflare_protection'
  | 'login_required'
  | 'javascript_rendered'
  | 'graphql_detected'
  | 'hidden_api'
  | 'infinite_scroll'
  | 'token_missing'
  | 'forbidden_403'
  | 'no_jobs_available'
  | 'wrong_careers_url'
  | 'rate_limited'
  | 'robots_blocked'
  | 'fetch_failed'
  | 'unknown_dom';

export interface ProbeSignals {
  httpStatus?: number;
  html?: string;
  finalUrl?: string;
  atsPlatform: string;
  apiEndpoints: string[];
  careersPageUrl?: string | null;
  robotsAllowed: boolean;
  graphqlDetected: boolean;
  jobsFoundOnSample?: number;
}

export function classifyInvestigationReasons(signals: ProbeSignals): InvestigationReason[] {
  const reasons: InvestigationReason[] = [];
  const html = signals.html ?? '';

  if (signals.httpStatus === 403) reasons.push('forbidden_403');
  if (signals.httpStatus === 429) reasons.push('rate_limited');
  if (!signals.httpStatus || signals.httpStatus >= 500) {
    if (!html) reasons.push('fetch_failed');
  }

  if (/cloudflare|cf-ray|challenge-platform|just a moment/i.test(html)) {
    reasons.push('cloudflare_protection');
  }
  if (/login|sign[\s-]?in|authenticate|sso|oauth/i.test(html) && /password|connexion|se connecter/i.test(html)) {
    reasons.push('login_required');
  }
  if (
    signals.atsPlatform === 'custom' &&
    (/__NEXT_DATA__|react-root|ng-app|data-reactroot|nuxt/i.test(html) ||
      /window\.__INITIAL_STATE__|hydration/i.test(html))
  ) {
    reasons.push('javascript_rendered');
  }
  if (signals.graphqlDetected) reasons.push('graphql_detected');
  if (signals.atsPlatform === 'custom' && signals.apiEndpoints.length === 0) {
    reasons.push('hidden_api');
  }
  if (/infinite.?scroll|load.?more|voir plus/i.test(html)) reasons.push('infinite_scroll');
  if (/api[_-]?key|bearer|authorization required|token/i.test(html) && signals.apiEndpoints.length === 0) {
    reasons.push('token_missing');
  }
  if (!signals.careersPageUrl) reasons.push('wrong_careers_url');
  if (!signals.robotsAllowed) reasons.push('robots_blocked');
  if (signals.jobsFoundOnSample === 0 && signals.atsPlatform !== 'custom') {
    reasons.push('no_jobs_available');
  }
  if (signals.atsPlatform === 'custom' && reasons.length === 0) {
    reasons.push('unknown_dom');
  }

  return [...new Set(reasons)];
}

export function formatInvestigationReason(reason: InvestigationReason): string {
  const labels: Record<InvestigationReason, string> = {
    cloudflare_protection: 'Cloudflare protection',
    login_required: 'Login required',
    javascript_rendered: 'JavaScript rendered',
    graphql_detected: 'GraphQL detected',
    hidden_api: 'Hidden API (network intercept needed)',
    infinite_scroll: 'Infinite scroll pagination',
    token_missing: 'Token / API key missing',
    forbidden_403: '403 responses',
    no_jobs_available: 'No jobs available',
    wrong_careers_url: 'Wrong careers URL',
    rate_limited: 'Rate limited',
    robots_blocked: 'Robots.txt blocked',
    fetch_failed: 'Fetch failed',
    unknown_dom: 'Unknown DOM structure',
  };
  return labels[reason];
}
