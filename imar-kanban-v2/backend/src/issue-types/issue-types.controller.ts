import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IssueTypesService } from './issue-types.service';

@ApiTags('IssueTypes')
@ApiBearerAuth()
@Controller()
export class IssueTypesController {
  constructor(private issueTypesService: IssueTypesService) {}

  @Get('projects/:projectId/issue-types')
  findByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.issueTypesService.findByProject(projectId);
  }

  @Post('projects/:projectId/issue-types')
  create(@Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: any) {
    return this.issueTypesService.create(projectId, dto);
  }

  @Patch('issue-types/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.issueTypesService.update(id, dto);
  }

  @Delete('issue-types/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.issueTypesService.remove(id);
  }
}
