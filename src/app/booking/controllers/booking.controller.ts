/**
 * Todo: Addonly leaner check
 */
import { Body, Controller, Post } from '@nestjs/common';
import { BookingService } from '../services/booking.service';

import { JwtPayload } from '@interfaces/user.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CreateBookingDto } from '../dto/create-booking.dto';

@Controller('bookings/v1')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(
    @CurrentUser() currentUser: JwtPayload,
    @Body() payload: CreateBookingDto,
  ) {
    return this.bookingService.createBooking(currentUser, payload);
  }

  @Post('status')
  async booking(@CurrentUser() currentUser: JwtPayload, @Body() payload: any) {
    return this.bookingService.status(currentUser, payload);
  }

  //   @Post('lessons')
  //   async bookLessons(
  //     @CurrentUser() currentUser: JwtPayload,
  //     @Body() dto: BookLessonsDto,
  //   ) {
  //     return this.bookingService.bookLessons(currentUser, dto);
  //   }
}

// POST /bookings

// {
//   "instructorId": "675aaa09887abc54",
//   "totalHours": 5,
//   "lessons": [
//     {
//       "slotId": "SLOT001",
//       "date": "2025-12-02",
//       "startTime": "09:00",
//       "endTime": "10:00",
//       "pickupAddress": "123 Pitt Street",
//       "suburbId": "SUB101"
//     },
//     {
//       "slotId": "SLOT002",
//       "date": "2025-12-03",
//       "startTime": "11:00",
//       "endTime": "13:00",
//       "pickupAddress": "50 City Road",
//       "suburbId": "SUB102"
//     }
//   ]
// }
