export function  isSlotInTimeOfDay(
  startTime: string,
  timeOfDay?: 'AM' | 'PM' | 'am' | 'pm',
): boolean {
  if (!timeOfDay) return true;

  const normalized = timeOfDay.toLowerCase();
  const hour = Number(startTime.split(':')[0]);

  return normalized === 'am' ? hour < 12 : hour >= 12;
}

type Transaction = {
  amount: number;
  discountPercent: number;
};

export function getDiscountSummary(transactions: Transaction[]) {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const totalDiscount = transactions.reduce(
    (sum, t) => sum + (t.amount * t.discountPercent) / 100,
    0
  );

  return {
    totalAmount,
    totalDiscount,
    effectiveDiscount: totalAmount
      ? (totalDiscount / totalAmount) * 100
      : 0,
  };
}