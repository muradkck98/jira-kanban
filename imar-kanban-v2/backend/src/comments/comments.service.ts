import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async findByIssue(issueId: string) {
    return this.prisma.comment.findMany({
      where: { issueId, deletedAt: null },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(issueId: string, content: string, userId: string) {
    const comment = await this.prisma.comment.create({
      data: { issueId, userId, content },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
      },
    });
    await this.prisma.activity.create({
      data: { issueId, userId, action: "commented", newValue: content.substring(0, 100) },
    });
    return comment;
  }

  async update(id: string, content: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.deletedAt) throw new NotFoundException("Yorum bulunamadi.");
    if (comment.userId !== userId) throw new ForbiddenException("Yalnizca kendi yorumunuzu duzenleyebilirsiniz.");
    return this.prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.deletedAt) throw new NotFoundException("Yorum bulunamadi.");
    if (comment.userId !== userId) throw new ForbiddenException("Yalnizca kendi yorumunuzu silebilirsiniz.");
    await this.prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }
}
