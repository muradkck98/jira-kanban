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
import { FormSubmissionsService } from './form-submissions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('FormSubmissions')
@ApiBearerAuth()
@Controller()
export class FormSubmissionsController {
  constructor(private formSubmissionsService: FormSubmissionsService) {}

  @Get('projects/:projectId/form-submissions')
  @ApiOperation({ summary: 'Projeye ait form taleplerini listele' })
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') status?: string,
  ) {
    return this.formSubmissionsService.findByProject(projectId, status);
  }

  @Get('projects/:projectId/form-submissions/pending-count')
  @ApiOperation({ summary: 'Bekleyen talep sayısı' })
  getPendingCount(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.formSubmissionsService.getPendingCount(projectId);
  }

  @Get('form-submissions/:id')
  @ApiOperation({ summary: 'Form talebi detayı' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.formSubmissionsService.findOne(id);
  }

  @Post('projects/:projectId/form-submissions')
  @ApiOperation({ summary: 'Yeni form talebi gönder' })
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.formSubmissionsService.create(projectId, dto, userId);
  }

  @Post('form-submissions/:id/accept')
  @ApiOperation({ summary: 'Form talebini kabul et ve issue oluştur' })
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reviewNote') reviewNote: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.formSubmissionsService.accept(id, userId, reviewNote);
  }

  @Post('form-submissions/:id/reject')
  @ApiOperation({ summary: 'Form talebini reddet' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reviewNote') reviewNote: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.formSubmissionsService.reject(id, userId, reviewNote);
  }

  @Delete('form-submissions/:id')
  @ApiOperation({ summary: 'Form talebi sil' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.formSubmissionsService.remove(id);
  }
}
