import { Module } from '@nestjs/common';
import { UserDbService } from '../../common/db/services/user.db.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../common/db/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { AddressModule } from '@app/address/address.module';
import { AddressSchema, UserAddress } from '@common/db/schemas/address.schema';
import { DbModule } from '@common/db/ db.module';
import { InstructorController } from './controllers/instructor.controller';
import { InstructorService } from './services/instructor.service';
import { Package, PackageSchema } from '@common/db/schemas/package.schema';
import { InstructorSlotController } from './controllers/instructor.slot.controller';
import { InstructorSlotService } from './services/instructor.slot.service';
import { Slot, SlotSchema } from '@common/db/schemas/slot.schema';
import { CryptoHelper } from '@common/helpers/crypto.helper';
import {
  InstructorProfile,
  InstructorProfileSchema,
} from '@common/db/schemas/instructor-profile.schema';
import { Order, OrderSchema } from '@common/db/schemas/order.schema';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserAddress.name, schema: AddressSchema },
      { name: Package.name, schema: PackageSchema },
      { name: Order.name, schema: OrderSchema },
      {
        name: Slot.name,
        schema: SlotSchema,
      },
      {
        name: InstructorProfile.name,
        schema: InstructorProfileSchema,
      },
    ]),
    AddressModule,
    DbModule,
  ],
  controllers: [InstructorController, InstructorSlotController],
  providers: [
    InstructorService,
    InstructorSlotService,
    UserDbService,
    CryptoHelper,
  ],
  exports: [InstructorService],
})
export class InstructorModule {}
