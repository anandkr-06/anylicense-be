import { BadRequestException } from '@nestjs/common';
import { func } from 'joi';

// export function convertTo24Hour(time: string): string {
//   const [timePart, meridian] = time.trim().split(' ');
//   let [hours = 0, minutes = 0] = (timePart || '').split(':').map(Number);

//   if (meridian && meridian.toUpperCase() === 'PM' && hours !== 12) {
//     hours += 12;
//   }

//   if (meridian?.toUpperCase() === 'AM' && hours === 12) {
//     hours = 0;
//   }

//   return `${hours.toString().padStart(2, '0')}:${minutes
//     .toString()
//     .padStart(2, '0')}`;
// }

export function toAmPm(time24: string): string {
  const [hourStr, minute] = time24.split(':');
  let hour = Number(hourStr);

  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;

  return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
}

export function convertTo24Hour(time: unknown): string {
  if (typeof time !== 'string') {
    throw new BadRequestException(`Invalid time type`);
  }

  const clean = time.trim();

  // ❌ Reject pure 24-hour format
  if (/^\d{2}:\d{2}$/.test(clean)) {
    throw new BadRequestException(
      `Time must be in AM/PM format (e.g. 08:00 AM)`,
    );
  }

  // ✅ Accept only "hh:mm AM/PM" (case-insensitive)
  const match = clean.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);

  if (!match) {
    throw new BadRequestException(
      `Invalid time format: ${time}. Use hh:mm AM/PM`,
    );
  }

  let [, h, m, modifier] = match;

  if (!modifier) {
    throw new BadRequestException(`Invalid time format: ${time}. Use hh:mm AM/PM`);
  }

  let hours = Number(h);
  const minutes = Number(m);
  const mod = modifier.toUpperCase();

  if (hours < 1 || hours > 12 || minutes > 59) {
    throw new BadRequestException(`Invalid time value: ${time}`);
  }

  if (mod === 'PM' && hours !== 12) hours += 12;
  if (mod === 'AM' && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
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

export function validateSlotDuration(
  startTime: string,
  endTime: string,
  date: string,
) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  if (sh == null || sm == null || eh == null || em == null) {
    throw new BadRequestException(`Invalid time format for start or end time.`);
  }

  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
    throw new BadRequestException(`Invalid time format for start or end time.`);
  }

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  const duration = endMinutes - startMinutes;

  const allowedDurations = [60, 120, 150];

  if (!allowedDurations.includes(duration)) {
    throw new BadRequestException(
      `Invalid slot duration on ${date}. Allowed durations: 1h, 2h, 2.5h`,
    );
  }
}


export function normalizeAndValidateSlots(
  slots: { startTime: string; endTime: string }[],
  date?: string,
) {
  const normalized = slots.map(slot => {
    const start = convertTo24Hour(slot.startTime);
    const end = convertTo24Hour(slot.endTime);

    if (start >= end) {
      throw new BadRequestException(
        `Invalid slot time ${slot.startTime} - ${slot.endTime}` +
          (date ? ` on ${date}` : ''),
      );
    }

    // ⏱️ Allowed durations only
    const durationMinutes =
      (Number(end.slice(0, 2)) * 60 + Number(end.slice(3))) -
      (Number(start.slice(0, 2)) * 60 + Number(start.slice(3)));

    if (![60, 120, 150].includes(durationMinutes)) {
      throw new BadRequestException(
        `Slot duration must be 1h, 2h, or 2.5h`,
      );
    }

    return {
      startTime: start,
      endTime: end,
      isBooked: false,
      bookingId: undefined,
    };
  });

  // 🧠 sort slots
  normalized.sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  // 🔒 overlap + 30 min gap validation
  for (let i = 1; i < normalized.length; i++) {
    const prev = normalized[i - 1];
    const curr = normalized[i];

    const prevEndMinutes =
      prev ? Number(prev.endTime.slice(0, 2)) * 60 +
      Number(prev.endTime.slice(3)) : 0;

    const currStartMinutes =
      Number(curr?.startTime.slice(0, 2) || '0') * 60 +
      Number(curr?.startTime.slice(3) || '0');

    const gap = currStartMinutes - prevEndMinutes;

    if (gap < 30) {
      throw new BadRequestException(
        `Minimum 30 minutes gap required between slots`,
      );
    }
  }

  return normalized;
}

