import { Module } from '@nestjs/common';

import { SuburbController } from './controllers/suburb.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Suburb, SuburbSchema } from '@common/db/schemas/suburb.schema';
import { DbModule } from '@common/db/ db.module';
import { SuburbDbService } from '@common/db/services/suburb.db.service';
import { SuburbService } from './services/suburb.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Suburb.name, schema: SuburbSchema }]),
    DbModule,
  ],
  controllers: [SuburbController],
  providers: [SuburbDbService, SuburbService],
})
export class SuburbModule {}
