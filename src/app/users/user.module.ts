import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { MoreProfile } from './services/moreprofile.service';
import { UserController } from './controllers/user.controller';
import { UserDbService } from '../../common/db/services/user.db.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../common/db/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { AddressModule } from '@app/address/address.module';
import { AddressSchema, UserAddress } from '@common/db/schemas/address.schema';
import { DbModule } from '@common/db/ db.module';
import { Package, PackageSchema } from '@common/db/schemas/package.schema';
import { InstructorProfile,InstructorProfileSchema } from '@common/db/schemas/instructor-profile.schema';


@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      //{ name: UserAddress.name, schema: AddressSchema },
      { name: Package.name, schema: PackageSchema },
      { name: InstructorProfile.name, schema: InstructorProfileSchema },
    ]),
    // AddressModule,

    DbModule,
  ],
  controllers: [UserController, ],
  providers: [UserService, UserDbService, MoreProfile],
  exports: [UserService,MoreProfile],
})
export class UserModule {}
