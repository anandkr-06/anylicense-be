import { Module } from '@nestjs/common';
import { UserDbService } from '../../common/db/services/user.db.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../common/db/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { AddressModule } from '@app/address/address.module';
import { AddressSchema, UserAddress } from '@common/db/schemas/address.schema';
import { DbModule } from '@common/db/ db.module';

import { Package, PackageSchema } from '@common/db/schemas/package.schema';
import { ServiceAreaController } from './controllers/service-area.controller';
import { ServiceAreaServices } from './services/service-area.service';
import { Suburb, SuburbSchema } from '@common/db/schemas/suburb.schema';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Suburb.name, schema: SuburbSchema },
      { name: UserAddress.name, schema: AddressSchema },
      { name: Package.name, schema: PackageSchema },
    ]),
    AddressModule,
    DbModule,
  ],
  controllers: [ServiceAreaController],
  providers: [ServiceAreaServices, UserDbService],
  exports: [ServiceAreaServices],
})
export class ServiceAreaModule {}
