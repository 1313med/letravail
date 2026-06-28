/**
 * ATS platform detection — maps career URLs to reusable adapter strategies.
 */
export type AtsPlatform =
  | 'workday'
  | 'greenhouse'
  | 'lever'
  | 'smartrecruiters'
  | 'successfactors'
  | 'talentsoft'
  | 'oracle-recruiting'
  | 'taleo'
  | 'icims'
  | 'teamtailor'
  | 'personio'
  | 'bamboohr'
  | 'recruitee'
  | 'ashby'
  | 'csod'
  | 'custom';

export interface AtsProfile {
  platform: AtsPlatform;
  urlPatterns: RegExp[];
  apiHints?: string[];
  detailFetchStrategy: 'api' | 'dom' | 'hybrid';
}

export const ATS_REGISTRY: AtsProfile[] = [
  { platform: 'csod', urlPatterns: [/csod\.com/i, /cornerstoneondemand/i], apiHints: ['rec-job-search'], detailFetchStrategy: 'api' },
  { platform: 'workday', urlPatterns: [/myworkdayjobs\.com/i, /workday\.com.*careers/i], detailFetchStrategy: 'api' },
  { platform: 'greenhouse', urlPatterns: [/greenhouse\.io/i, /boards\.greenhouse/i], detailFetchStrategy: 'api' },
  { platform: 'lever', urlPatterns: [/lever\.co/i, /jobs\.lever/i], detailFetchStrategy: 'api' },
  { platform: 'smartrecruiters', urlPatterns: [/smartrecruiters\.com/i], detailFetchStrategy: 'api' },
  { platform: 'talentsoft', urlPatterns: [/talent-soft\.com/i], detailFetchStrategy: 'hybrid' },
  { platform: 'successfactors', urlPatterns: [/successfactors\.com/i, /career\d+\.successfactors/i, /performancemanager\.successfactors/i], detailFetchStrategy: 'hybrid' },
  { platform: 'oracle-recruiting', urlPatterns: [/oraclecloud\.com.*recruiting/i, /fa\.oraclecloud/i], detailFetchStrategy: 'api' },
  { platform: 'taleo', urlPatterns: [/taleo\.net/i], detailFetchStrategy: 'dom' },
  { platform: 'icims', urlPatterns: [/icims\.com/i], detailFetchStrategy: 'dom' },
  { platform: 'teamtailor', urlPatterns: [/teamtailor\.com/i], detailFetchStrategy: 'api' },
  { platform: 'personio', urlPatterns: [/personio\./i], detailFetchStrategy: 'api' },
  { platform: 'bamboohr', urlPatterns: [/bamboohr\.com/i], detailFetchStrategy: 'dom' },
  { platform: 'recruitee', urlPatterns: [/recruitee\.com/i], detailFetchStrategy: 'api' },
  { platform: 'ashby', urlPatterns: [/ashbyhq\.com/i, /jobs\.ashbyhq/i], detailFetchStrategy: 'api' },
];

export function detectAtsPlatform(url: string): AtsProfile | undefined {
  return ATS_REGISTRY.find((ats) => ats.urlPatterns.some((p) => p.test(url)));
}

export function detectAtsFromUrls(urls: string[]): AtsPlatform {
  for (const url of urls) {
    const profile = detectAtsPlatform(url);
    if (profile) return profile.platform;
  }
  return 'custom';
}
