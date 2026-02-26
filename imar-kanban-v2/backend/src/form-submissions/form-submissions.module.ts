import { Module } from '@nestjs/common';
import { FormSubmissionsService } from './form-submissions.service';
import { FormSubmissionsController } from './form-submissions.controller';

@Module({
  providers: [FormSubmissionsService],
  controllers: [FormSubmissionsController],
})
export class FormSubmissionsModule {}
