import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Learner, LearnerSchema } from '../../common/db/schemas/learner.schema';
import { JwtModule } from '@nestjs/jwt';
import { DbModule } from '@common/db/ db.module';
import { LearnerController } from './controllers/learner.controller';
import { LearnerService } from './services/leaner.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: Learner.name, schema: LearnerSchema },
    ]),
    DbModule,
  ],
  controllers: [LearnerController],
  providers: [LearnerService],
  exports: [LearnerService],
})
export class UserLearnersModule {}