import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Client;
  private bucket: string;
  private publicUrl: string;

  async onModuleInit() {
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = parseInt(process.env.MINIO_PORT || '9000', 10);
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin123';
    this.bucket = process.env.MINIO_BUCKET || 'imar-kanban';
    this.publicUrl = process.env.MINIO_PUBLIC_URL || `http://localhost:9000`;

    this.client = new Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    await this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Bucket '${this.bucket}' created`);
      }

      // Her zaman public read policy uygula (bucket onceden olusturulmus olsa bile)
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
      this.logger.log(`Bucket '${this.bucket}' ready - public read policy applied`);
    } catch (err) {
      this.logger.error('MinIO bucket setup failed:', err);
    }
  }

  async uploadFile(
    objectName: string,
    buffer: Buffer,
    mimeType: string,
    size: number,
  ): Promise<string> {
    const stream = Readable.from(buffer);
    await this.client.putObject(this.bucket, objectName, stream, size, {
      'Content-Type': mimeType,
    });
    return `${this.publicUrl}/${this.bucket}/${objectName}`;
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, objectName);
    } catch (err) {
      this.logger.warn(`Failed to delete object ${objectName}:`, err);
    }
  }

  getPublicUrl(objectName: string): string {
    return `${this.publicUrl}/${this.bucket}/${objectName}`;
  }
}
