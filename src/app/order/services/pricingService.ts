import { Injectable } from '@nestjs/common';
import { SlotDto } from '../dto/create-order.dto';

@Injectable()
export class PricingService {

  // calculatePurchase(slots: SlotDto[], pricePerHour: number, testPrice: number) {

  //   let lessonHours = 0;
  //   let testCount = 0;
  
  //   for (const slot of slots) {
  //     if (slot.type === 'LESSON') {
  //       const duration = this.getDuration(slot.startTime, slot.endTime);
  //       lessonHours += duration;
  //     }
  
  //     if (slot.type === 'TEST') {
  //       testCount += 1;
  //     }
  //   }
  
  //   return {
  //     totalHours: lessonHours + testCount * 2.5,
  //     purchaseAmount: lessonHours * pricePerHour, // ❗ TEST removed here
  //   };
  // }
  calculatePurchase(
    lessonHours: number,
    slots: SlotDto[],
    pricePerHour: number,
    testPrice: number,
  ) {
    let slotLessonHours = 0;
    let testCount = 0;
  
    for (const slot of slots) {
      if (slot.type === 'LESSON') {
        const duration = this.getDuration(slot.startTime, slot.endTime);
        slotLessonHours += duration;
      }
  
      if (slot.type === 'TEST') {
        testCount += 1;
      }
    }
  
    const totalLessonHours = lessonHours + slotLessonHours;
  
    const lessonAmount = totalLessonHours * pricePerHour;
    const testAmount = testCount * testPrice;
  
    return {
      totalHours: totalLessonHours + testCount * 2.5,
      purchaseAmount: lessonAmount + testAmount,
    };
  }
  private getDuration(startTime: string, endTime: string): number {
    const start = new Date(`1970-01-01 ${startTime}`);
    const end = new Date(`1970-01-01 ${endTime}`);
  
    const diffMs = end.getTime() - start.getTime();
  
    const hours = diffMs / (1000 * 60 * 60);
  
    return hours;
  }
}