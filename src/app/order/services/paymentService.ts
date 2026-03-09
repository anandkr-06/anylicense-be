
import { InstructorProfile, InstructorProfileDocument } from '@common/db/schemas/instructor-profile.schema';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
 

  @Injectable()
  export class PaymentService {
    calculatePayment(
      purchaseAmount:number,
      bookingAmount:number,
      walletBalance:number,
    ) {
      let walletUsed = 0;
  
      if (bookingAmount > 0) {
        walletUsed = Math.min(walletBalance, bookingAmount);
      }
  
      const stripeBooking = bookingAmount - walletUsed;
  
      const stripeAmount = purchaseAmount + stripeBooking;
  
      return {
        walletUsed,
        stripeAmount,
        payableAmount: purchaseAmount + bookingAmount,
      };
    }
  }