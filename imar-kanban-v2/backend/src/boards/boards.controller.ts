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
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateColumnDto } from './dto/create-column.dto';

@ApiTags('Boards')
@ApiBearerAuth()
@Controller()
export class BoardsController {
  constructor(private boardsService: BoardsService) {}

  // ─── Boards ────────────────────────────────────────────────────────────────

  @Get('projects/:projectId/boards')
  @ApiOperation({ summary: 'Projeye ait panoları listele' })
  findByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.boardsService.findByProject(projectId);
  }

  @Get('boards/:id')
  @ApiOperation({ summary: 'Pano detayı (sütunlar + kartlar)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.boardsService.findOne(id);
  }

  @Post('projects/:projectId/boards')
  @ApiOperation({ summary: 'Yeni pano oluştur' })
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateBoardDto,
  ) {
    return this.boardsService.create(projectId, dto);
  }

  @Patch('boards/:id')
  @ApiOperation({ summary: 'Pano güncelle' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateBoardDto>,
  ) {
    return this.boardsService.update(id, dto);
  }

  @Delete('boards/:id')
  @ApiOperation({ summary: 'Pano sil' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.boardsService.remove(id);
  }

  // ─── Columns ───────────────────────────────────────────────────────────────

  @Post('boards/:boardId/columns')
  @ApiOperation({ summary: 'Panoya sütun ekle' })
  createColumn(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.boardsService.createColumn(boardId, dto);
  }

  @Patch('columns/:id')
  @ApiOperation({ summary: 'Sütun güncelle' })
  updateColumn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateColumnDto>,
  ) {
    return this.boardsService.updateColumn(id, dto);
  }

  @Delete('columns/:id')
  @ApiOperation({ summary: 'Sütun sil' })
  removeColumn(@Param('id', ParseUUIDPipe) id: string) {
    return this.boardsService.removeColumn(id);
  }

  @Patch('boards/:boardId/columns/reorder')
  @ApiOperation({ summary: 'Sütunları yeniden sırala' })
  reorderColumns(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body('columnIds') columnIds: string[],
  ) {
    return this.boardsService.reorderColumns(boardId, columnIds);
  }
}
