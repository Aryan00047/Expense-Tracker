export function calculateCostPerDay(
  packageCost: number,
  packageQuantity: number,
  dailyConsumption: number
): number {
  const costPerUnit = packageCost / packageQuantity;
  return Number((costPerUnit * dailyConsumption).toFixed(2));
}