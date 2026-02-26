import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FormSubmissionsService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string, status?: string) {
    return this.prisma.formSubmission.findMany({
      where: {
        projectId,
        ...(status && { status }),
      },
      include: {
        submittedBy: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
        reviewedBy: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const form = await this.prisma.formSubmission.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
        reviewedBy: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!form) throw new NotFoundException('Form talebi bulunamadı.');
    return form;
  }

  async create(
    projectId: string,
    dto: {
      issueTypeKey: string;
      title: string;
      description: string;
      priority?: string;
      assigneeId?: string;
    },
    submittedById: string,
  ) {
    return this.prisma.formSubmission.create({
      data: {
        projectId,
        submittedById,
        issueTypeKey: dto.issueTypeKey,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'medium',
        assigneeId: dto.assigneeId,
        status: 'pending',
      },
      include: {
        submittedBy: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
      },
    });
  }

  async accept(id: string, reviewedById: string, reviewNote?: string) {
    const form = await this.findOne(id);
    if (form.status !== 'pending') {
      throw new BadRequestException('Yalnızca bekleyen talepler kabul edilebilir.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Find the first board and its first todo column
      const board = await tx.board.findFirst({
        where: { projectId: form.projectId },
        include: {
          columns: { where: { category: 'todo' }, orderBy: { position: 'asc' }, take: 1 },
        },
      });

      if (!board || !board.columns.length) {
        throw new BadRequestException('Bu projede uygun bir pano veya sütun bulunamadı.');
      }

      const column = board.columns[0];

      // Increment project counter
      const project = await tx.project.update({
        where: { id: form.projectId },
        data: { issueCounter: { increment: 1 } },
        select: { key: true, issueCounter: true },
      });

      // Get issue type for this key
      const issueType = await tx.issueType.findFirst({
        where: {
          projectId: form.projectId,
          name: { contains: form.issueTypeKey, mode: 'insensitive' },
        },
      });

      const issueNumber = project.issueCounter;
      const issueKey = `${project.key}-${issueNumber}`;

      const positionCount = await tx.issue.count({ where: { columnId: column.id, deletedAt: null } });

      // Create the issue from the form submission
      const issue = await tx.issue.create({
        data: {
          projectId: form.projectId,
          boardId: board.id,
          columnId: column.id,
          issueTypeId: issueType?.id,
          issueNumber,
          issueKey,
          title: form.title,
          description: form.description,
          priority: form.priority,
          reporterId: form.submittedById,
          assigneeId: form.assigneeId,
          position: positionCount,
        },
      });

      // Update form submission status
      const updated = await tx.formSubmission.update({
        where: { id },
        data: {
          status: 'accepted',
          reviewedById,
          reviewNote,
          reviewedAt: new Date(),
          createdIssueId: issue.id,
        },
        include: {
          submittedBy: { select: { id: true, displayName: true, avatarUrl: true } },
          reviewedBy: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      });

      return { formSubmission: updated, createdIssue: issue };
    });
  }

  async reject(id: string, reviewedById: string, reviewNote?: string) {
    const form = await this.findOne(id);
    if (form.status !== 'pending') {
      throw new BadRequestException('Yalnızca bekleyen talepler reddedilebilir.');
    }

    return this.prisma.formSubmission.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedById,
        reviewNote,
        reviewedAt: new Date(),
      },
      include: {
        submittedBy: { select: { id: true, displayName: true, avatarUrl: true } },
        reviewedBy: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.formSubmission.delete({ where: { id } });
    return { deleted: true };
  }

  // Count pending per project
  async getPendingCount(projectId: string) {
    const count = await this.prisma.formSubmission.count({
      where: { projectId, status: 'pending' },
    });
    return { count };
  }
}
