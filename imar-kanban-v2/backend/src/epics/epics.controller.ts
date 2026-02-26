import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EpicsService } from './epics.service';

@ApiTags('Epics')
@ApiBearerAuth()
@Controller()
export class EpicsController {
  constructor(private epicsService: EpicsService) {}

  @Get('projects/:projectId/epics')
  findByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.epicsService.findByProject(projectId);
  }

  @Get('epics/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.epicsService.findOne(id);
  }

  @Post('projects/:projectId/epics')
  create(@Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: any) {
    return this.epicsService.create(projectId, dto);
  }

  @Patch('epics/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.epicsService.update(id, dto);
  }

  @Delete('epics/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.epicsService.remove(id);
  }
}
