import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SprintsService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string) {
    return this.prisma.sprint.findMany({
      where: { projectId },
      include: { _count: { select: { issues: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id },
      include: {
        issues: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { id: true, displayName: true, avatarUrl: true } },
            issueType: true,
            column: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });
    if (!sprint) throw new NotFoundException("Sprint bulunamadi.");
    return sprint;
  }

  async create(projectId: string, dto: { name: string; goal?: string; startDate?: string; endDate?: string }) {
    return this.prisma.sprint.create({
      data: {
        projectId,
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async update(id: string, dto: { name?: string; goal?: string; startDate?: string; endDate?: string }) {
    await this.findOne(id);
    return this.prisma.sprint.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.goal !== undefined && { goal: dto.goal }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      },
    });
  }

  async start(id: string) {
    const sprint = await this.findOne(id);
    if (sprint.status !== "planning") throw new BadRequestException("Yalnizca planlama asamasindaki sprint baslatilabilir.");
    return this.prisma.sprint.update({ where: { id }, data: { status: "active", startDate: new Date() } });
  }

  async complete(id: string) {
    const sprint = await this.findOne(id);
    if (sprint.status !== "active") throw new BadRequestException("Yalnizca aktif sprint tamamlanabilir.");
    await this.prisma.issue.updateMany({ where: { sprintId: id }, data: { sprintId: null } });
    return this.prisma.sprint.update({ where: { id }, data: { status: "completed", completedAt: new Date() } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.issue.updateMany({ where: { sprintId: id }, data: { sprintId: null } });
    await this.prisma.sprint.delete({ where: { id } });
    return { deleted: true };
  }
}
