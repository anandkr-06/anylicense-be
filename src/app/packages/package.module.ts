import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { DbModule } from '@common/db/ db.module';
import { PackageController } from './controllers/package.controller';
import { PackageService } from './services/package.service';
import { Package, PackageSchema } from '@common/db/schemas/package.schema';
import { PackageDbService } from '@common/db/services/package.db.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([{ name: Package.name, schema: PackageSchema }]),
    DbModule,
  ],
  controllers: [PackageController],
  providers: [PackageService, PackageDbService],
  exports: [],
})
export class PackageModule {}
