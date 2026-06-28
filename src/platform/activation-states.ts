/**
 * Employer activation lifecycle states — Sprint 7.
 */
export type ActivationState =
  | 'DISCOVERED'
  | 'PROBED'
  | 'VALIDATED'
  | 'READY'
  | 'ACTIVE'
  | 'MONITORED';

export const ACTIVATION_ORDER: ActivationState[] = [
  'DISCOVERED',
  'PROBED',
  'VALIDATED',
  'READY',
  'ACTIVE',
  'MONITORED',
];

export const ACTIVATION_THRESHOLDS = {
  AUTO_ACTIVATE_CONFIDENCE: 90,
  VALIDATION_QUALITY_MIN: 60,
  HEALTH_DEACTIVATE: 40,
  HEALTH_MONITORED_MIN: 70,
  RETRY_INTERVAL_HOURS: 6,
  REPROBE_HEALTH_THRESHOLD: 50,
  REPROBE_CONFIDENCE_DROP: 15,
  MAX_RETRIES: 12,
} as const;

export function isProductionState(state: string | null | undefined): boolean {
  return state === 'ACTIVE' || state === 'MONITORED';
}

export function canScheduleCrawl(state: string | null | undefined): boolean {
  if (!state || state === 'active') return true;
  return isProductionState(state);
}

export function initialActivationState(confidence: number): ActivationState {
  if (confidence >= 70) return 'READY';
  if (confidence >= 40) return 'PROBED';
  return 'DISCOVERED';
}
