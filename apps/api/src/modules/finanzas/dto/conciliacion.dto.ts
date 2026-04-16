import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class InitConciliacionDto {
  @IsString()
  cuentaBancaria: string;

  @IsInt()
  @Min(1)
  @Max(12)
  mes: number;

  @IsInt()
  @Min(2000)
  anio: number;
}

export class ConciliacionQueryDto {
  @IsOptional()
  @IsString()
  cuentaBancaria?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}
