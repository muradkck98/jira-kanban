import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LabelsService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string) {
    return this.prisma.label.findMany({
      where: { projectId },
      include: { _count: { select: { issues: true } } },
      orderBy: { name: "asc" },
    });
  }

  async create(projectId: string, dto: { name: string; color?: string }) {
    return this.prisma.label.create({
      data: { projectId, name: dto.name, color: dto.color || "#1890ff" },
    });
  }

  async update(id: string, dto: { name?: string; color?: string }) {
    const label = await this.prisma.label.findUnique({ where: { id } });
    if (!label) throw new NotFoundException("Etiket bulunamadi.");
    return this.prisma.label.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const label = await this.prisma.label.findUnique({ where: { id } });
    if (!label) throw new NotFoundException("Etiket bulunamadi.");
    await this.prisma.label.delete({ where: { id } });
    return { deleted: true };
  }
}
