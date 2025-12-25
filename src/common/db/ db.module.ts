import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressSchema, UserAddress } from './schemas/address.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UserDbService } from './services/user.db.service';
import { UserAddressDbService } from './services/address.db.service';
import { Suburb, SuburbSchema } from './schemas/suburb.schema';
import { Package, PackageSchema } from './schemas/package.schema';
import { Slot, SlotSchema } from './schemas/slot.schema';
import { PackageDbService } from './services/package.db.service';
import { SuburbDbService } from './services/suburb.db.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserAddress.name, schema: AddressSchema },
      { name: Slot.name, schema: SlotSchema },
      { name: Suburb.name, schema: SuburbSchema },
      { name: Package.name, schema: PackageSchema },
    ]),
  ],
  providers: [
    UserDbService,
    UserAddressDbService,
    PackageDbService,
    SuburbDbService,
  ],
  exports: [
    UserDbService,
    UserAddressDbService,
    PackageDbService,
    SuburbDbService,
  ],
})
export class DbModule {}
