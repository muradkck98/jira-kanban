import { IsString, IsNotEmpty, IsOptional, MaxLength, IsInt, Min, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateColumnDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ enum: ['todo', 'in_progress', 'in_review', 'done'] })
  @IsOptional()
  @IsIn(['todo', 'in_progress', 'in_review', 'done'])
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  wipLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}
