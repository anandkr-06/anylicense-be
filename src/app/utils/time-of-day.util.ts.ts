export function  isSlotInTimeOfDay(
  startTime: string,
  timeOfDay?: 'AM' | 'PM' | 'am' | 'pm',
): boolean {
  if (!timeOfDay) return true;

  const normalized = timeOfDay.toLowerCase();
  const hour = Number(startTime.split(':')[0]);

  return normalized === 'am' ? hour < 12 : hour >= 12;
}