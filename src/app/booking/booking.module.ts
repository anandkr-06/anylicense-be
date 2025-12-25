import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Booking, BookingSchema } from './schemas/booking.schema';
import { BookingController } from './controllers/booking.controller';
import { BookingService } from './services/booking.service';
import { DbModule } from '@common/db/ db.module';
import { Lesson, LessonSchema } from './schemas/lesson.schema';
import { Slot, SlotSchema } from '@common/db/schemas/slot.schema';
import { Package, PackageSchema } from '@common/db/schemas/package.schema';
import { PackageDbService } from '@common/db/services/package.db.service';
import { SuburbDbService } from '@common/db/services/suburb.db.service';
import { Suburb, SuburbSchema } from '@common/db/schemas/suburb.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Suburb.name, schema: SuburbSchema },
      { name: Slot.name, schema: SlotSchema },
      { name: Package.name, schema: PackageSchema },
    ]),
    DbModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, PackageDbService, SuburbDbService],
})
export class BookingModule {}
