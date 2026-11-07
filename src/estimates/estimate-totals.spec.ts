import { computeEstimateItems } from './estimate-totals';

describe('computeEstimateItems', () => {
  it('computes line totals and grand total', () => {
    const { lines, totalCents } = computeEstimateItems([
      {
        description: 'Kit',
        category: 'PART',
        quantity: 2,
        unitPriceCents: 1000,
      },
      {
        description: 'Labor',
        category: 'LABOR',
        quantity: 1,
        unitPriceCents: 500,
      },
    ]);

    expect(lines).toEqual([
      expect.objectContaining({
        lineTotalCents: 2000,
        sortOrder: 0,
      }),
      expect.objectContaining({
        lineTotalCents: 500,
        sortOrder: 1,
      }),
    ]);
    expect(totalCents).toBe(2500);
  });

  it('allows zero unit price', () => {
    const { totalCents } = computeEstimateItems([
      {
        description: 'Cortesia',
        category: 'LABOR',
        quantity: 1,
        unitPriceCents: 0,
      },
    ]);
    expect(totalCents).toBe(0);
  });
});
