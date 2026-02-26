import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const PROJECT_INCLUDE = {
  owner: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  members: {
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, email: true, department: true },
      },
    },
  },
  _count: {
    select: { issues: true, boards: true },
  },
};

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: {
        isArchived: false,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: PROJECT_INCLUDE,
    });
    if (!project) throw new NotFoundException('Proje bulunamadı.');
    this.checkAccess(project, userId);
    return project;
  }

  async findByKey(key: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { key },
      include: PROJECT_INCLUDE,
    });
    if (!project) throw new NotFoundException('Proje bulunamadı.');
    this.checkAccess(project, userId);
    return project;
  }

  async create(dto: CreateProjectDto, userId: string) {
    const existing = await this.prisma.project.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictException('Bu proje anahtarı zaten kullanılıyor.');

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: dto.name,
          key: dto.key,
          description: dto.description,
          ownerId: userId,
        },
      });

      // Add owner as admin member
      await tx.projectMember.create({
        data: { projectId: project.id, userId, role: 'admin' },
      });

      // Create default board
      const board = await tx.board.create({
        data: {
          projectId: project.id,
          name: 'Ana Pano',
          description: 'Varsayılan Kanban panosu',
        },
      });

      // Create default columns
      const defaultColumns = [
        { name: 'Yapılacak', category: 'todo', position: 0 },
        { name: 'Devam Ediyor', category: 'in_progress', position: 1 },
        { name: 'Gözden Geçirme', category: 'in_review', position: 2 },
        { name: 'Tamamlandı', category: 'done', position: 3 },
      ];
      for (const col of defaultColumns) {
        await tx.column.create({ data: { boardId: board.id, ...col } });
      }

      // Create default issue types
      const defaultIssueTypes = [
        { name: 'Epic', icon: '🚀', color: '#FF8B00' },
        { name: 'Story', icon: '📗', color: '#6554C0' },
        { name: 'Task', icon: '✅', color: '#0052CC' },
        { name: 'Bug', icon: '🔴', color: '#FF5630' },
        { name: 'Alt Görev', icon: '🔷', color: '#00B8D9' },
      ];
      for (const it of defaultIssueTypes) {
        await tx.issueType.create({ data: { projectId: project.id, ...it } });
      }

      // Invite members if provided
      if (dto.inviteMembers?.length) {
        for (const invite of dto.inviteMembers) {
          const invitedUser = await tx.user.findFirst({
            where: { email: invite.email },
          });
          if (invitedUser && invitedUser.id !== userId) {
            await tx.projectMember.upsert({
              where: { projectId_userId: { projectId: project.id, userId: invitedUser.id } },
              create: { projectId: project.id, userId: invitedUser.id, role: invite.role || 'member' },
              update: { role: invite.role || 'member' },
            });
          }
        }
      }

      return tx.project.findUnique({ where: { id: project.id }, include: PROJECT_INCLUDE });
    });
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    const project = await this.findOne(id, userId);
    this.checkOwnerOrAdmin(project, userId);
    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: PROJECT_INCLUDE,
    });
  }

  async remove(id: string, userId: string) {
    const project = await this.findOne(id, userId);
    if (project.ownerId !== userId) throw new ForbiddenException('Yalnızca proje sahibi silebilir.');
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Members ───────────────────────────────────────────────────────────────

  async addMember(projectId: string, targetUserId: string, role: string, requesterId: string) {
    const project = await this.findOne(projectId, requesterId);
    this.checkOwnerOrAdmin(project, requesterId);

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (existing) throw new ConflictException('Kullanıcı zaten bu projenin üyesi.');

    return this.prisma.projectMember.create({
      data: { projectId, userId: targetUserId, role },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async updateMemberRole(projectId: string, targetUserId: string, role: string, requesterId: string) {
    const project = await this.findOne(projectId, requesterId);
    this.checkOwnerOrAdmin(project, requesterId);

    return this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      data: { role },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async removeMember(projectId: string, targetUserId: string, requesterId: string) {
    const project = await this.findOne(projectId, requesterId);
    this.checkOwnerOrAdmin(project, requesterId);
    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    return { removed: true };
  }

  async getMembers(projectId: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            fullName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private checkAccess(project: any, userId: string) {
    const isMember = project.members?.some((m: any) => m.userId === userId);
    const isOwner = project.ownerId === userId;
    if (!isMember && !isOwner) throw new ForbiddenException('Bu projeye erişim izniniz yok.');
  }

  private checkOwnerOrAdmin(project: any, userId: string) {
    const isOwner = project.ownerId === userId;
    const isAdmin = project.members?.some((m: any) => m.userId === userId && m.role === 'admin');
    if (!isOwner && !isAdmin) throw new ForbiddenException('Bu işlem için yetkiniz yok.');
  }
}
