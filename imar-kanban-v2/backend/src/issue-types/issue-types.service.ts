import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IssueTypesService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string) {
    return this.prisma.issueType.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  async create(projectId: string, dto: { name: string; icon?: string; color?: string }) {
    return this.prisma.issueType.create({
      data: { projectId, name: dto.name, icon: dto.icon, color: dto.color },
    });
  }

  async update(id: string, dto: { name?: string; icon?: string; color?: string }) {
    const it = await this.prisma.issueType.findUnique({ where: { id } });
    if (!it) throw new NotFoundException('İş türü bulunamadı.');
    return this.prisma.issueType.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const it = await this.prisma.issueType.findUnique({ where: { id } });
    if (!it) throw new NotFoundException('İş türü bulunamadı.');
    // Unassign from issues
    await this.prisma.issue.updateMany({ where: { issueTypeId: id }, data: { issueTypeId: null } });
    await this.prisma.issueType.delete({ where: { id } });
    return { deleted: true };
  }
}
