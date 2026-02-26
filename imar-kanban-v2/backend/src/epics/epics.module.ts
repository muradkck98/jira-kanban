import { Module } from '@nestjs/common';
import { EpicsService } from './epics.service';
import { EpicsController } from './epics.controller';

@Module({
  providers: [EpicsService],
  controllers: [EpicsController],
})
export class EpicsModule {}
