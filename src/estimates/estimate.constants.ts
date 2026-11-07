export const REPAIR_ESTIMATE_STATUSES = [
  'DRAFT',
  'FINALIZED',
  'ARCHIVED',
] as const;

export type RepairEstimateStatusValue =
  (typeof REPAIR_ESTIMATE_STATUSES)[number];

export const REPAIR_ESTIMATE_STATUS_TRANSITIONS: Record<
  RepairEstimateStatusValue,
  readonly RepairEstimateStatusValue[]
> = {
  DRAFT: ['FINALIZED', 'ARCHIVED'],
  FINALIZED: ['DRAFT', 'ARCHIVED'],
  ARCHIVED: [],
};

export const REPAIR_ESTIMATE_ITEM_CATEGORIES = ['PART', 'LABOR'] as const;

export type RepairEstimateItemCategoryValue =
  (typeof REPAIR_ESTIMATE_ITEM_CATEGORIES)[number];

export const REPAIR_ESTIMATE_CURRENCY = 'BRL' as const;

/** Max line items per estimate (ATP-38). */
export const REPAIR_ESTIMATE_MAX_ITEMS = 50;

/** Max unit price in cents (R$ 1.000.000,00). */
export const REPAIR_ESTIMATE_MAX_UNIT_PRICE_CENTS = 100_000_000;
