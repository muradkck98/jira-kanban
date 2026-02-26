import { Module } from '@nestjs/common';
import { IssueTypesService } from './issue-types.service';
import { IssueTypesController } from './issue-types.controller';

@Module({
  providers: [IssueTypesService],
  controllers: [IssueTypesController],
})
export class IssueTypesModule {}
