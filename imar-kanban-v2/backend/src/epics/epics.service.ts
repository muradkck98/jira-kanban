import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EpicsService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string) {
    return this.prisma.epic.findMany({
      where: { projectId },
      include: {
        issues: {
          where: { deletedAt: null },
          select: {
            id: true,
            storyPoints: true,
            column: { select: { category: true } },
          },
        },
        _count: { select: { issues: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const epic = await this.prisma.epic.findUnique({
      where: { id },
      include: {
        issues: {
          where: { deletedAt: null },
          select: {
            id: true,
            issueKey: true,
            title: true,
            priority: true,
            storyPoints: true,
            column: { select: { name: true, category: true } },
            assignee: { select: { id: true, displayName: true, avatarUrl: true } },
            issueType: { select: { name: true, icon: true, color: true } },
          },
        },
        _count: { select: { issues: true } },
      },
    });
    if (!epic) throw new NotFoundException('Epic bulunamadı.');
    return epic;
  }

  async create(projectId: string, dto: { name: string; description?: string; color?: string; startDate?: string; targetDate?: string }) {
    return this.prisma.epic.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        color: dto.color,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async update(id: string, dto: { name?: string; description?: string; color?: string; status?: string; startDate?: string; targetDate?: string }) {
    await this.findOne(id);
    return this.prisma.epic.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.status && { status: dto.status }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.targetDate !== undefined && { targetDate: dto.targetDate ? new Date(dto.targetDate) : null }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Unassign issues
    await this.prisma.issue.updateMany({ where: { epicId: id }, data: { epicId: null } });
    await this.prisma.epic.delete({ where: { id } });
    return { deleted: true };
  }
}
