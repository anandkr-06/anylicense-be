import { BadRequestException } from "@nestjs/common";
import { amPmTo24, timeToMinutes } from "./slots";

export function calculateSlotDurationInHours(
    startTime: string,
    endTime: string,
  ): number {
    if (!startTime || !endTime) {
      throw new BadRequestException('Slot time missing');
    }
  
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
  
    if (endMinutes <= startMinutes) {
      throw new BadRequestException(
        'Invalid to calculate slot hours!',
      );
    }
  
    const diffMinutes = endMinutes - startMinutes;
  
    return diffMinutes / 60;
  }

  export function normalizeTime(time: string): string {
    // Already 24h
    if (/^\d{1,2}:\d{2}$/.test(time)) return time;
  
    // Convert AM/PM → 24h
    return amPmTo24(time);
  }
  