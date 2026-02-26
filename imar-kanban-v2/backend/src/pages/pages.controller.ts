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
import { PagesService } from './pages.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Pages')
@ApiBearerAuth()
@Controller()
export class PagesController {
  constructor(private pagesService: PagesService) {}

  @Get('projects/:projectId/pages')
  @ApiOperation({ summary: 'Projeye ait sayfaları listele' })
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('search') search?: string,
  ) {
    return this.pagesService.findByProject(projectId, search);
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Sayfa detayı' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pagesService.findOne(id, userId);
  }

  @Public()
  @Get('share/:token')
  @ApiOperation({ summary: 'Paylaşım linki ile sayfayı görüntüle (giriş gerektirmez)' })
  findByToken(@Param('token') token: string) {
    return this.pagesService.findByShareToken(token);
  }

  @Post('projects/:projectId/pages')
  @ApiOperation({ summary: 'Yeni sayfa oluştur' })
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.pagesService.create(projectId, dto, userId);
  }

  @Patch('pages/:id')
  @ApiOperation({ summary: 'Sayfa güncelle' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.pagesService.update(id, dto, userId);
  }

  @Post('pages/:id/star')
  @ApiOperation({ summary: 'Sayfa yıldızla/yıldızı kaldır' })
  toggleStar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pagesService.toggleStar(id, userId);
  }

  @Post('pages/:id/share')
  @ApiOperation({ summary: 'Sayfa için paylaşım linki oluştur' })
  generateShare(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pagesService.generateShareLink(id, userId);
  }

  @Delete('pages/:id/share')
  @ApiOperation({ summary: 'Paylaşım linkini iptal et' })
  revokeShare(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pagesService.revokeShareLink(id, userId);
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: 'Sayfayı sil (soft delete)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pagesService.remove(id, userId);
  }
}
