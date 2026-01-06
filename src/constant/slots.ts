import { BadRequestException } from '@nestjs/common';

export function convertTo24Hour(time: string): string {
  const [timePart, meridian] = time.trim().split(' ');
  let [hours = 0, minutes = 0] = (timePart || '').split(':').map(Number);

  if (meridian && meridian.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  }

  if (meridian?.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
}

export function toAmPm(time24: string): string {
  const [hourStr, minute] = time24.split(':');
  let hour = Number(hourStr);

  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;

  return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
}



export function amPmTo24(time: string): string {
  const trimmed = time.trim();

  // already 24h
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);

  if (!match) {
    throw new BadRequestException(
      `Invalid time format. Expected HH:MM AM/PM, got "${time}"`
    );
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const modifier = match[3]!.toUpperCase(); // ✅ FIX

  if (hours < 1 || hours > 12) {
    throw new BadRequestException(`Invalid hour value: ${match[1]}`);
  }

  if (minutes < 0 || minutes > 59) {
    throw new BadRequestException(`Invalid minute value: ${match[2]}`);
  }

  let h = hours;

  if (modifier === 'PM' && h !== 12) h += 12;
  if (modifier === 'AM' && h === 12) h = 0;

  return `${h.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
}
