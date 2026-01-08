export interface FoodItem {
  id: number;
  name: string;
  packageCost: number;      // total package price
  packageQuantity: number;  // total quantity in package
  unit: 'g' | 'ml' | 'pcs';
  dailyConsumption: number; // how much user eats per day
  costPerDay: number;
}
