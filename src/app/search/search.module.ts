import { Module } from '@nestjs/common';
import { UserDbService } from '../../common/db/services/user.db.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../common/db/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { AddressModule } from '@app/address/address.module';
import { DbModule } from '@common/db/ db.module';
import { Package, PackageSchema } from '@common/db/schemas/package.schema';
import { Suburb, SuburbSchema } from '@common/db/schemas/suburb.schema';
import { SearchController } from './controllers/search.controller';
import { SearchService } from './services/search.service';
import { Slot, SlotSchema } from '@common/db/schemas/slot.schema';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Suburb.name, schema: SuburbSchema },
      { name: Slot.name, schema: SlotSchema },
      { name: Package.name, schema: PackageSchema },
    ]),
    AddressModule,
    DbModule,
  ],
  controllers: [SearchController],
  providers: [SearchService, UserDbService],
  exports: [SearchService],
})
export class SearchModule {}
