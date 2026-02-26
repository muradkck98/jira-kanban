import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class AddMemberBody {
  userId: string;
  role?: string;
}

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Kullanıcının erişebildiği projeleri listele' })
  findAll(@CurrentUser('id') userId: string) {
    return this.projectsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Proje detayı (UUID)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.findOne(id, userId);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Proje anahtarına göre getir' })
  findByKey(
    @Param('key') key: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.findByKey(key, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Yeni proje oluştur' })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.create(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Proje güncelle' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Proje sil' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.remove(id, userId);
  }

  // ─── Members ───────────────────────────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'Proje üyelerini listele' })
  getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Projeye üye ekle' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddMemberBody,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.addMember(id, body.userId, body.role || 'member', userId);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Üye rolünü güncelle' })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body('role') role: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.updateMemberRole(id, memberId, role, userId);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Üyeyi projeden çıkar' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.removeMember(id, memberId, userId);
  }
}
