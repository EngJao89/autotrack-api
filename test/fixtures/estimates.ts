export const validEstimatePayload = {
  title: 'Troca de embreagem',
  description: 'Orçamento oficina centro',
  items: [
    {
      description: 'Kit embreagem',
      category: 'PART' as const,
      quantity: 1,
      unitPriceCents: 89000,
    },
    {
      description: 'Mão de obra',
      category: 'LABOR' as const,
      quantity: 1,
      unitPriceCents: 35000,
    },
  ],
};

export function buildEstimatePayload(
  overrides: Partial<typeof validEstimatePayload> = {},
) {
  return {
    ...validEstimatePayload,
    ...overrides,
    items: overrides.items ?? validEstimatePayload.items,
  };
}
