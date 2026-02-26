import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateColumnDto } from './dto/create-column.dto';

const BOARD_INCLUDE = {
  columns: {
    orderBy: { position: 'asc' as const },
    include: {
      issues: {
        where: { deletedAt: null },
        include: {
          assignee: { select: { id: true, displayName: true, fullName: true, avatarUrl: true, username: true } },
          reporter: { select: { id: true, displayName: true, fullName: true, avatarUrl: true, username: true } },
          labels: true,
          issueType: true,
          sprint: { select: { id: true, name: true, status: true } },
          epic: { select: { id: true, name: true, color: true } },
          parent: { select: { id: true, issueKey: true, title: true, issueType: { select: { name: true } } } },
          _count: { select: { subtasks: true, comments: true } },
        },
        orderBy: { position: 'asc' as const },
      },
    },
  },
  _count: { select: { issues: true } },
};

@Injectable()
export class BoardsService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string) {
    return this.prisma.board.findMany({
      where: { projectId },
      include: BOARD_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: BOARD_INCLUDE,
    });
    if (!board) throw new NotFoundException('Pano bulunamadı.');
    return board;
  }

  async create(projectId: string, dto: CreateBoardDto) {
    const board = await this.prisma.board.create({
      data: { projectId, ...dto },
    });

    // Create default columns
    const defaults = [
      { name: 'Yapılacak', category: 'todo', position: 0 },
      { name: 'Devam Ediyor', category: 'in_progress', position: 1 },
      { name: 'Gözden Geçirme', category: 'in_review', position: 2 },
      { name: 'Tamamlandı', category: 'done', position: 3 },
    ];
    for (const col of defaults) {
      await this.prisma.column.create({ data: { boardId: board.id, ...col } });
    }

    return this.findOne(board.id);
  }

  async update(id: string, dto: Partial<CreateBoardDto>) {
    await this.findOne(id);
    return this.prisma.board.update({
      where: { id },
      data: dto,
      include: BOARD_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.board.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Columns ───────────────────────────────────────────────────────────────

  async createColumn(boardId: string, dto: CreateColumnDto) {
    await this.findOne(boardId);

    if (dto.position === undefined) {
      const count = await this.prisma.column.count({ where: { boardId } });
      dto.position = count;
    }

    return this.prisma.column.create({
      data: { boardId, ...dto },
    });
  }

  async updateColumn(columnId: string, dto: Partial<CreateColumnDto>) {
    const col = await this.prisma.column.findUnique({ where: { id: columnId } });
    if (!col) throw new NotFoundException('Sütun bulunamadı.');
    return this.prisma.column.update({ where: { id: columnId }, data: dto });
  }

  async removeColumn(columnId: string) {
    const col = await this.prisma.column.findUnique({ where: { id: columnId } });
    if (!col) throw new NotFoundException('Sütun bulunamadı.');
    await this.prisma.column.delete({ where: { id: columnId } });
    return { deleted: true };
  }

  async reorderColumns(boardId: string, columnIds: string[]) {
    await this.findOne(boardId);
    const updates = columnIds.map((id, index) =>
      this.prisma.column.update({ where: { id }, data: { position: index } }),
    );
    await this.prisma.$transaction(updates);
    return this.findOne(boardId);
  }
}
