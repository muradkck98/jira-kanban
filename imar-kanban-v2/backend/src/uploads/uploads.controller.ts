import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinioService } from './minio.service';

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller()
export class UploadsController {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  @Post('issues/:issueId/attachments')
  @ApiOperation({ summary: 'Issue e dosya/gorsel ekle (MinIO)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Desteklenmeyen dosya turu.'), false);
        }
      },
    }),
  )
  async uploadAttachment(
    @Param('issueId', ParseUUIDPipe) issueId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) throw new BadRequestException('Dosya yuklenemedi.');
    const ext = extname(file.originalname).toLowerCase();
    const objectName = `attachments/${issueId}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const publicUrl = await this.minioService.uploadFile(objectName, file.buffer, file.mimetype, file.size);
    const isImage = IMAGE_MIME.includes(file.mimetype);
    const attachment = await this.prisma.attachment.create({
      data: { issueId, userId, filename: file.originalname, filePath: publicUrl, fileSize: file.size, mimeType: file.mimetype },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    return { ...attachment, fileSize: Number(attachment.fileSize), url: publicUrl, isImage };
  }

  @Get('issues/:issueId/attachments')
  @ApiOperation({ summary: 'Issue eklerini listele' })
  async listAttachments(@Param('issueId', ParseUUIDPipe) issueId: string) {
    const attachments = await this.prisma.attachment.findMany({
      where: { issueId, deletedAt: null },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return attachments.map((a) => ({
      ...a,
      fileSize: Number(a.fileSize),
      url: a.filePath,
      isImage: IMAGE_MIME.includes(a.mimeType || ''),
    }));
  }

  @Post('uploads/temp')
  @ApiOperation({ summary: 'Geçici dosya yükle - issue veya form bağlantısı olmadan' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Desteklenmeyen dosya turu.'), false);
        }
      },
    }),
  )
  async uploadTemp(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya yuklenemedi.');
    const ext = extname(file.originalname).toLowerCase();
    const objectName = `temp/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const publicUrl = await this.minioService.uploadFile(objectName, file.buffer, file.mimetype, file.size);
    const isImage = IMAGE_MIME.includes(file.mimetype);
    return { url: publicUrl, filename: file.originalname, size: file.size, isImage };
  }

  @Delete('attachments/:id')
  @ApiOperation({ summary: 'Eki sil' })
  async deleteAttachment(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment || attachment.deletedAt) throw new BadRequestException('Ek bulunamadi.');
    if (attachment.userId !== userId) throw new BadRequestException('Bu eki silme yetkiniz yok.');
    await this.prisma.attachment.update({ where: { id }, data: { deletedAt: new Date() } });
    try {
      const bucket = process.env.MINIO_BUCKET || 'imar-kanban';
      const bucketPrefix = `/${bucket}/`;
      const idx = attachment.filePath.indexOf(bucketPrefix);
      if (idx !== -1) {
        const objectName = attachment.filePath.substring(idx + bucketPrefix.length);
        await this.minioService.deleteFile(objectName);
      }
    } catch { /* non-critical */ }
    return { deleted: true };
  }
}
