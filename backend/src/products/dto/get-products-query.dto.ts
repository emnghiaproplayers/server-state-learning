import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cursor?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 5;
}
