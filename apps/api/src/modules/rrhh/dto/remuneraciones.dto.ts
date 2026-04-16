import {
  IsString, IsEnum, IsOptional, IsNumber, IsInt, IsArray, Min, Max,
  ValidateNested, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FondoImputacionDto {
  @IsString()
  fondoId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  porcentaje: number;
}

export class GenerarLiquidacionDto {
  @IsString()
  funcionarioId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  mes: number;

  @IsInt()
  @Min(2000)
  anio: number;

  // Override sueldo base (optional — uses funcionario.sueldoBase if not provided)
  @IsOptional()
  @IsNumber()
  @Min(0)
  sueldoBase?: number;

  // Bono extra (propinas, reemplazos, etc.)
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonoExtra?: number;

  // Horas extra trabajadas este mes
  @IsOptional()
  @IsNumber()
  @Min(0)
  horasExtra?: number;

  // Imputación por fondo (deben sumar 100%)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FondoImputacionDto)
  fondoImputacion?: FondoImputacionDto[];

  // Tasa AFP si difiere del default (10%)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  tasaAFP?: number;

  // Tasa Salud si difiere del default (7%)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(15)
  tasaSalud?: number;
}

export class GenerarMasivaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenerarLiquidacionDto)
  liquidaciones: GenerarLiquidacionDto[];
}

export class LiquidacionQueryDto {
  @IsOptional()
  @IsString()
  funcionarioId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class AprobarLiquidacionDto {
  @IsOptional()
  @IsDateString()
  fechaPago?: string;
}
