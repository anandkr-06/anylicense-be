import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserDbService } from '../../common/db/services/user.db.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../common/db/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { AddressModule } from '@app/address/address.module';
import { AddressSchema, UserAddress } from '@common/db/schemas/address.schema';
import { DbModule } from '@common/db/ db.module';
import { PackageModule } from '@app/packages/package.module';
import { Package, PackageSchema } from '@common/db/schemas/package.schema';
import { LearnerController } from './controllers/leaner.controller';
import { LeanerService } from './services/leaner.service';

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
    ]),
    AddressModule,

    DbModule,
  ],
  controllers: [UserController, LearnerController],
  providers: [UserService, UserDbService, LeanerService],
  exports: [UserService],
})
export class UserModule {}
