export interface DayItem {
  foodId: number;
  quantity: number;
  cost: number;
}

export interface DayLog {
  date: string;          // ddmmyyyy
  dateISO: Date;
  items: DayItem[];
  extraCost: number;
  totalCost: number;
}
