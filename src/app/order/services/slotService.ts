import { amPmTo24, validateSlotDuration } from '@constant/slots';
import { Injectable } from '@nestjs/common';
import { SlotDto, SlotType } from '../dto/create-order.dto';

type NormalizedSlot = SlotDto & {
  startTime: string;
  endTime: string;
};

@Injectable()
export class SlotService {
  normalizeSlots(slots: SlotDto[]): NormalizedSlot[] {
    return slots.map((s) => ({
      ...s,
      startTime: amPmTo24(s.startTime),
      endTime: amPmTo24(s.endTime),
    }));
  }

  calculateSlotUsage(
    slots: NormalizedSlot[],
    pricePerHour: number,
    testPrice: number,
  ): { usedHours: number; bookingAmount: number } {
    let usedHours = 0;
    let bookingAmount = 0;

    for (const slot of slots) {
      const duration = this.validateSlotDuration(
        slot.startTime,
        slot.endTime,
        slot.type,
      );

      usedHours += duration;

      if (slot.type === SlotType.LESSON) {
        bookingAmount += duration * pricePerHour;
      }

      if (slot.type === SlotType.TEST) {
        bookingAmount += testPrice;
      }
    }

    return { usedHours, bookingAmount };
  }

  getDuration(startTime: string, endTime: string): number {

    const start = new Date(`1970-01-01 ${startTime}`);
    const end = new Date(`1970-01-01 ${endTime}`);
  
    const diffMs = end.getTime() - start.getTime();
  
    const hours = diffMs / (1000 * 60 * 60);
  
    return hours;
  }
private validateSlotDuration(
    startTime: string,
    endTime: string,
    type: SlotType,
  ): number {
  
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
  
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  
    if (duration <= 0) {
      throw new Error('Invalid slot duration');
    }
  
    if (type === SlotType.TEST && duration !== 2.5) {
      throw new Error('Test slot must be exactly 2.5 hours');
    }
  
    return duration;
  }

  
}