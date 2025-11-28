import { IsPositive, IsOptional } from "class-validator";
import { Type } from "class-transformer";


export class PaginationDto {
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  public page: number = 1;

  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  public limit: number = 10;
}