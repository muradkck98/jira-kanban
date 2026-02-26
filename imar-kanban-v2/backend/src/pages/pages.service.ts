import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string, search?: string) {
    return this.prisma.page.findMany({
      where: {
        projectId,
        deletedAt: null,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { tags: { has: search } },
          ],
        }),
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
      },
      orderBy: [{ isStarred: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
      },
    });
    if (!page || page.deletedAt) throw new NotFoundException('Sayfa bulunamadı.');
    return page;
  }

  async findByShareToken(token: string) {
    const page = await this.prisma.page.findUnique({
      where: { shareToken: token },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        project: { select: { id: true, name: true, key: true } },
      },
    });
    if (!page || page.deletedAt) throw new NotFoundException('Sayfa bulunamadı.');
    return page;
  }

  async create(
    projectId: string,
    dto: { title: string; content?: string; emoji?: string; tags?: string[] },
    authorId: string,
  ) {
    return this.prisma.page.create({
      data: {
        projectId,
        authorId,
        title: dto.title,
        content: dto.content || '',
        emoji: dto.emoji,
        tags: dto.tags || [],
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async update(
    id: string,
    dto: { title?: string; content?: string; emoji?: string; tags?: string[]; isStarred?: boolean },
    userId: string,
  ) {
    await this.findOne(id, userId);
    return this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.emoji !== undefined && { emoji: dto.emoji }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.isStarred !== undefined && { isStarred: dto.isStarred }),
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async toggleStar(id: string, userId: string) {
    const page = await this.findOne(id, userId);
    return this.prisma.page.update({
      where: { id },
      data: { isStarred: !page.isStarred },
    });
  }

  async generateShareLink(id: string, userId: string) {
    await this.findOne(id, userId);
    const token = crypto.randomBytes(32).toString('hex');
    const updated = await this.prisma.page.update({
      where: { id },
      data: { shareToken: token },
      select: { id: true, shareToken: true },
    });
    return updated;
  }

  async revokeShareLink(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.page.update({ where: { id }, data: { shareToken: null } });
    return { revoked: true };
  }

  async remove(id: string, userId: string) {
    const page = await this.findOne(id, userId);
    if (page.authorId !== userId) {
      throw new ForbiddenException('Yalnızca sayfanın yazarı silebilir.');
    }
    await this.prisma.page.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }
}
