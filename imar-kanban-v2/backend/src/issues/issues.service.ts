import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

const ISSUE_INCLUDE = {
  assignee: { select: { id: true, displayName: true, fullName: true, avatarUrl: true, username: true } },
  reporter: { select: { id: true, displayName: true, fullName: true, avatarUrl: true, username: true } },
  labels: true,
  issueType: true,
  epic: { select: { id: true, name: true, color: true } },
  sprint: { select: { id: true, name: true, status: true } },
  column: { select: { id: true, name: true, category: true } },
  subtasks: {
    where: { deletedAt: null },
    select: {
      id: true,
      issueKey: true,
      title: true,
      priority: true,
      assignee: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  },
  _count: {
    select: { comments: true, attachments: true, subtasks: true },
  },
};

@Injectable()
export class IssuesService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string, filters?: {
    sprintId?: string;
    assigneeId?: string;
    priority?: string;
    search?: string;
    includeSubtasks?: boolean;
  }) {
    return this.prisma.issue.findMany({
      where: {
        projectId,
        deletedAt: null,
        // includeSubtasks=true ise alt görevler de dahil, false ise sadece üst seviye
        ...(!filters?.includeSubtasks && { parentId: null }),
        ...(filters?.sprintId && { sprintId: filters.sprintId }),
        ...(filters?.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters?.priority && { priority: filters.priority }),
        ...(filters?.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { issueKey: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: ISSUE_INCLUDE,
      orderBy: [{ column: { position: 'asc' } }, { position: 'asc' }],
    });
  }

  async findOne(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: {
        ...ISSUE_INCLUDE,
        comments: {
          where: { deletedAt: null },
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          where: { deletedAt: null },
          include: {
            user: { select: { id: true, displayName: true } },
          },
        },
        activities: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!issue || issue.deletedAt) throw new NotFoundException('İş kalemi bulunamadı.');
    return issue;
  }

  async create(dto: CreateIssueDto, reporterId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Increment project counter atomically
      const project = await tx.project.update({
        where: { id: dto.projectId },
        data: { issueCounter: { increment: 1 } },
        select: { id: true, key: true, issueCounter: true },
      });

      const issueNumber = project.issueCounter;
      const issueKey = `${project.key}-${issueNumber}`;

      // Get position (append to end)
      const count = await tx.issue.count({
        where: { columnId: dto.columnId, deletedAt: null },
      });

      const issue = await tx.issue.create({
        data: {
          projectId: dto.projectId,
          boardId: dto.boardId,
          columnId: dto.columnId,
          sprintId: dto.sprintId,
          epicId: dto.epicId,
          parentId: dto.parentId,
          issueTypeId: dto.issueTypeId,
          issueNumber,
          issueKey,
          title: dto.title,
          description: dto.description,
          priority: dto.priority || 'medium',
          storyPoints: dto.storyPoints,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          reporterId,
          assigneeId: dto.assigneeId,
          position: count,
          labels: dto.labelIds?.length
            ? { connect: dto.labelIds.map((id) => ({ id })) }
            : undefined,
        },
        include: ISSUE_INCLUDE,
      });

      // Log activity
      await tx.activity.create({
        data: {
          issueId: issue.id,
          userId: reporterId,
          action: 'created',
          newValue: issue.title,
        },
      });

      return issue;
    });
  }

  async update(id: string, dto: UpdateIssueDto, userId: string) {
    const issue = await this.findOne(id);

    const activities: Array<{ action: string; oldValue?: string; newValue?: string }> = [];

    // Track field changes for activity log
    if (dto.columnId && dto.columnId !== issue.columnId) {
      const oldCol = await this.prisma.column.findUnique({ where: { id: issue.columnId }, select: { name: true } });
      const newCol = await this.prisma.column.findUnique({ where: { id: dto.columnId }, select: { name: true } });
      activities.push({ action: 'moved', oldValue: oldCol?.name, newValue: newCol?.name });
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== issue.assigneeId) {
      activities.push({ action: 'assigned', oldValue: issue.assigneeId || undefined, newValue: dto.assigneeId || undefined });
    }
    if (dto.priority && dto.priority !== issue.priority) {
      activities.push({ action: 'priority_changed', oldValue: issue.priority, newValue: dto.priority });
    }

    const updated = await this.prisma.issue.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.columnId && { columnId: dto.columnId }),
        ...(dto.boardId !== undefined && { boardId: dto.boardId }),
        ...(dto.sprintId !== undefined && { sprintId: dto.sprintId || null }),
        ...(dto.epicId !== undefined && { epicId: dto.epicId || null }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId || null }),
        ...(dto.issueTypeId !== undefined && { issueTypeId: dto.issueTypeId || null }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.storyPoints !== undefined && { storyPoints: dto.storyPoints }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId || null }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.labelIds && {
          labels: { set: dto.labelIds.map((labelId) => ({ id: labelId })) },
        }),
      },
      include: ISSUE_INCLUDE,
    });

    // Log activities
    if (activities.length > 0) {
      await this.prisma.activity.createMany({
        data: activities.map((a) => ({
          issueId: id,
          userId,
          action: a.action,
          oldValue: a.oldValue,
          newValue: a.newValue,
        })),
      });
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    await this.prisma.issue.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.prisma.activity.create({
      data: { issueId: id, userId, action: 'deleted' },
    });
    return { deleted: true };
  }

  async moveIssue(issueId: string, targetColumnId: string, position: number, userId: string) {
    const issue = await this.findOne(issueId);
    return this.update(issueId, { columnId: targetColumnId, position }, userId);
  }

  async getBacklog(projectId: string) {
    return this.prisma.issue.findMany({
      where: { projectId, sprintId: null, deletedAt: null, parentId: null },
      include: ISSUE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }
}
