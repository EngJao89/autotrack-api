import type { EstimateItemInputDto } from './dto/estimate-item.dto';

export type ComputedEstimateItem = EstimateItemInputDto & {
  lineTotalCents: number;
  sortOrder: number;
};

export function computeEstimateItems(
  items: EstimateItemInputDto[],
): { lines: ComputedEstimateItem[]; totalCents: number } {
  const lines = items.map((item, index) => {
    const line: ComputedEstimateItem = {
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.quantity * item.unitPriceCents,
      sortOrder: index,
    };
    return line;
  });
  const totalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  return { lines, totalCents };
}
