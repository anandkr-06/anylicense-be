import { BadRequestException } from '@nestjs/common';


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


// export function amPmTo24(time: string): string {
//   const trimmed = time.trim();

//   // already 24h
//   if (/^\d{2}:\d{2}$/.test(trimmed)) {
//     return trimmed;
//   }

//   const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);

//   if (!match) {
//     throw new BadRequestException(
//       `Invalid time format. Expected HH:MM AM/PM, got "${time}"`
//     );
//   }

//   const hours = Number(match[1]);
//   const minutes = Number(match[2]);
//   const modifier = match[3]!.toUpperCase(); // ✅ FIX

//   if (hours < 1 || hours > 12) {
//     throw new BadRequestException(`Invalid hour value: ${match[1]}`);
//   }

//   if (minutes < 0 || minutes > 59) {
//     throw new BadRequestException(`Invalid minute value: ${match[2]}`);
//   }

//   let h = hours;

//   if (modifier === 'PM' && h !== 12) h += 12;
//   if (modifier === 'AM' && h === 12) h = 0;

//   return `${h.toString().padStart(2, '0')}:${minutes
//     .toString()
//     .padStart(2, '0')}`;
// }

export function validateSlotDuration(
  startTime: string,
  endTime: string,
  date: string,
) {
  const startMinutes =
    Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3));
  const endMinutes =
    Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3));

  const duration = endMinutes - startMinutes;

  // ✅ Minimum 1 hour slot
  if (duration < 60) {
    throw new BadRequestException(
      `Slot duration must be at least 1 hour on ${date}`,
    );
  }

  // ❌ No upper limit → 2 hr / 2.5 hr restriction removed
}



export function normalizeAndValidateSlots(
  slots: { startTime: string; endTime: string }[],
  date: string,
) {
  const converted = slots.map(slot => {
    const start = convertTo24Hour(slot.startTime);
    const end = convertTo24Hour(slot.endTime);

    if (start >= end) {
      throw new BadRequestException(
        `Invalid slot time ${slot.startTime} - ${slot.endTime} on ${date}`,
      );
    }

    const startMinutes =
      Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
    const endMinutes =
      Number(end.slice(0, 2)) * 60 + Number(end.slice(3));

    const duration = endMinutes - startMinutes;

    // ✅ Minimum 1 hour
    if (duration < 60) {
      throw new BadRequestException(
        `Slot duration must be at least 1 hour on ${date}`,
      );
    }

    return {
      startTime: start,
      endTime: end,
      isBooked: false,
      bookingId: undefined,
    };
  });

  // 🧠 Sort slots
  const sorted = converted.sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  // ❌ Overlap + ⏱️ 30-minute gap
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (!curr || !prev) {
      throw new BadRequestException('Invalid slot data');
    }
    // ❌ Overlap
    if (curr.startTime < prev.endTime) {
      throw new BadRequestException(
        `Overlapping slots on ${date}`,
      );
    }

    const gap =
      (Number(curr.startTime.slice(0, 2)) * 60 +
        Number(curr.startTime.slice(3))) -
      (Number(prev.endTime.slice(0, 2)) * 60 +
        Number(prev.endTime.slice(3)));

    // ⏱️ Minimum 30-minute gap
    if (gap < 30) {
      throw new BadRequestException(
        `Minimum 30 minutes gap required between slots on ${date}`,
      );
    }
  }

  return sorted;
}

export const splitSlotByDuration = (
  startTime: string,
  endTime: string,
  durationMinutes: number,
) => {
  const result = [];

  let start = toMinutes(startTime);
  const end = toMinutes(endTime);

  while (start + durationMinutes <= end) {
    result.push({
      startTime: toTime(start),
      endTime: toTime(start + durationMinutes),
    });

    // ✅ duration + 30 min gap
    start += durationMinutes + 30;
  }

  return result;
};

// const toMinutes = (time: string) => {
//   const [h, m] = time.split(':').map(Number);
//   if(h === undefined || m === undefined || isNaN(h) || isNaN(m)) {
//     throw new BadRequestException(`Invalid time format: ${time}`);
//   }
//   return h * 60 + m;
// };
const toMinutes = (time: string): number => {
  const t = time.toUpperCase().includes('AM') || time.toUpperCase().includes('PM')
    ? amPmTo24(time)   // 👈 convert only if needed
    : time;

  const [h, m] = t.split(':').map(Number);

  if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) {
    throw new BadRequestException(`Invalid time format: ${time}`);
  }

  return h * 60 + m;
};


const toTime = (minutes: number) => {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}`;
};


export const amPmTo24 = (time: string): string => {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);

  if (!match) {
    throw new BadRequestException(`Invalid time format: ${time}`);
  }

  let [, h, m, period] = match;
  let hour = Number(h);
  if(period === undefined) {
    throw new BadRequestException(`Invalid time format: ${time}`);
  }
  if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;

  return `${hour.toString().padStart(2, '0')}:${m}`;
};

function timeToMinutes(time: string): number {
  if (!time || typeof time !== 'string') {
    throw new BadRequestException(`Invalid time value: ${time}`);
  }

  const normalized = time.trim();

  // 24-hour format: "09:00" or "09:00:00"
  const twentyFourHr = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFourHr) {
    const hour = Number(twentyFourHr[1]);
    const minute = Number(twentyFourHr[2]);

    if (hour > 23 || minute > 59) {
      throw new BadRequestException(`Invalid 24h time: ${time}`);
    }

    return hour * 60 + minute;
  }

  // 12-hour format: "09:00 AM"
  const twelveHr = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  
  if (twelveHr) {
    let hour = Number(twelveHr[1]);
    const minute = Number(twelveHr[2]);
    if(!twelveHr[3]){
      throw new BadRequestException(`Getting time format error.`)
    }
    const meridian = twelveHr[3].toUpperCase();

    if (hour > 12 || minute > 59) {
      throw new BadRequestException(`Invalid 12h time: ${time}`);
    }

    if (meridian === 'PM' && hour !== 12) hour += 12;
    if (meridian === 'AM' && hour === 12) hour = 0;

    return hour * 60 + minute;
  }

  throw new BadRequestException(`Invalid time format: ${time}`);
}

export function minutesToAmPm(minutes: number): string {
  let h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';

  h = h % 12 || 12;

  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}


export function isOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return aStart < bEnd && aEnd > bStart;
}

export function convert12hToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);

  if (!match) {
    throw new BadRequestException(`Invalid time format: ${time}`);
  }

  const [, hourStr, minuteStr, meridianRaw] = match;
  if(!hourStr){
    throw new BadRequestException(`Invalid time format: ${hourStr}`);
  }
  if(!minuteStr){
    throw new BadRequestException(`Invalid time format: ${minuteStr}`);
  }
  if(!meridianRaw){
    throw new BadRequestException(`Invalid time format: ${meridianRaw}`);
  }
  let hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);
  const meridian = meridianRaw.toUpperCase();

  if (meridian === 'PM' && hours !== 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function toAmPmNew(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    throw new BadRequestException(`Invalid 24h time: ${time}`);
  }

  let hour = Number(match[1]);
  const minute = match[2];

  const meridian = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;

  return `${hour.toString().padStart(2, '0')}:${minute} ${meridian}`;
}

export function normalizeDate(date: unknown): string {
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  throw new Error(`Invalid date value: ${JSON.stringify(date)}`);
}



export function normalizeTime(time: unknown): string {
  if (typeof time === 'string') return time;
  if (time instanceof Date) return time.toISOString().slice(11, 16);
  throw new Error(`Invalid time value: ${JSON.stringify(time)}`);
}

