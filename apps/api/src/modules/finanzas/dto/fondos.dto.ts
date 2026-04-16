import { IsString, IsNumber, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFondoDto {
  @IsString()
  nombre: string;

  @IsNumber()
  @Min(0)
  presupuestoAnual: number;

  @IsInt()
  @Min(2000)
  anio: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateFondoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  presupuestoAnual?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class FondoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
