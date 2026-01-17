import { Module } from '@nestjs/common';

import { AddressLocationController } from './controllers/addresslocations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressLocation, AddressLocationSchema } from '@common/db/schemas/addresslocation.schema';

import { DbModule } from '@common/db/ db.module';


import { AddressLocationService } from './services/addresslocation.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AddressLocation.name, schema: AddressLocationSchema }]),
    DbModule,
  ],
  controllers: [AddressLocationController],
  providers: [AddressLocationService],
})
export class AddressLocationModule {}
