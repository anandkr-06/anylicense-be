import { Module } from '@nestjs/common';
import { UserDbService } from '../../common/db/services/user.db.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../common/db/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { AddressModule } from '@app/address/address.module';
import { AddressSchema, UserAddress } from '@common/db/schemas/address.schema';
import { DbModule } from '@common/db/ db.module';
import { Package, PackageSchema } from '@common/db/schemas/package.schema';
import { Slot, SlotSchema } from '@common/db/schemas/slot.schema';
import { LeanerSlotController } from './controllers/leaner.slot.controller';
import { LeanerSlotService } from './services/leaner.slot.service';

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
      {
        name: Slot.name,
        schema: SlotSchema,
      },
    ]),
    AddressModule,
    DbModule,
  ],
  controllers: [LeanerSlotController],
  providers: [LeanerSlotService, UserDbService],
  exports: [LeanerSlotService],
})
export class LeanerModule {}
