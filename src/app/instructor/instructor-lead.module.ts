import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InstructorLead,
  InstructorLeadSchema,
} from '@common/db/schemas/instructor-lead.schema';
import { InstructorLeadController } from '@app/instructor/controllers/instructor-lead.controller';
import { InstructorLeadService } from '@app/instructor/services/instructor-lead.service';
import { NotificationModule } from 'modules/notifications/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: InstructorLead.name,
        schema: InstructorLeadSchema,
      },
    ]),
    NotificationModule,
  ],
  controllers: [InstructorLeadController],
  providers: [InstructorLeadService],
})
export class InstructorLeadModule {}