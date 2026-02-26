import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Issues')
@ApiBearerAuth()
@Controller()
export class IssuesController {
  constructor(private issuesService: IssuesService) {}

  @Get('projects/:projectId/issues')
  @ApiOperation({ summary: 'Projeye ait iş kalemlerini listele' })
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('sprintId') sprintId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('includeSubtasks') includeSubtasks?: string,
  ) {
    return this.issuesService.findByProject(projectId, {
      sprintId,
      assigneeId,
      priority,
      search,
      includeSubtasks: includeSubtasks === 'true',
    });
  }

  @Get('projects/:projectId/backlog')
  @ApiOperation({ summary: 'Backlog (sprint atanmamış iş kalemleri)' })
  getBacklog(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.issuesService.getBacklog(projectId);
  }

  @Get('issues/:id')
  @ApiOperation({ summary: 'İş kalemi detayı' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.issuesService.findOne(id);
  }

  @Post('issues')
  @ApiOperation({ summary: 'Yeni iş kalemi oluştur' })
  create(
    @Body() dto: CreateIssueDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.issuesService.create(dto, userId);
  }

  @Patch('issues/:id')
  @ApiOperation({ summary: 'İş kalemi güncelle' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIssueDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.issuesService.update(id, dto, userId);
  }

  @Delete('issues/:id')
  @ApiOperation({ summary: 'İş kalemini sil (soft delete)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.issuesService.remove(id, userId);
  }

  @Patch('issues/:id/move')
  @ApiOperation({ summary: 'İş kalemini sürükle-bırak ile taşı' })
  move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('columnId') columnId: string,
    @Body('position') position: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.issuesService.moveIssue(id, columnId, position, userId);
  }
}
