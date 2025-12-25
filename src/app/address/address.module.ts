import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressSchema, UserAddress } from '@common/db/schemas/address.schema';
import { UserAddressService } from './services/address.service';
import { UserAddressDbService } from '@common/db/services/address.db.service';
import { User, UserSchema } from '@common/db/schemas/user.schema';
import { DbModule } from '@common/db/ db.module';
import { AddressController } from './controllers/address.controller';
import { Suburb, SuburbSchema } from '@common/db/schemas/suburb.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: UserAddress.name,
        schema: AddressSchema,
      },
      { name: User.name, schema: UserSchema },
      { name: Suburb.name, schema: SuburbSchema },
    ]),
    DbModule,
  ],
  controllers: [AddressController],
  providers: [UserAddressService, UserAddressDbService],
  exports: [UserAddressService],
})
export class AddressModule {}
