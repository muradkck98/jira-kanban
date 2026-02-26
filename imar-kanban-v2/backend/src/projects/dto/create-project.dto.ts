import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
  IsArray,
  ValidateNested,
  IsEmail,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ default: 'member' })
  @IsOptional()
  @IsIn(['admin', 'member', 'viewer'])
  role?: string;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'İmar Projesi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'IMAR' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Matches(/^[A-Z0-9]+$/, { message: 'Proje anahtarı yalnızca büyük harf ve rakam içerebilir.' })
  key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [InviteMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteMemberDto)
  inviteMembers?: InviteMemberDto[];
}
