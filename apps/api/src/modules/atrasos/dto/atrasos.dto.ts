import {
  IsString, IsOptional, IsBoolean, IsEnum, IsDateString, IsInt, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoAtrasoEnum {
  PRIMER_BLOQUE = 'PRIMER_BLOQUE',
  ENTRE_BLOQUES = 'ENTRE_BLOQUES',
}

export class CreateAtrasoDto {
  @IsString() alumnoId: string;
  @IsDateString() fecha: string;
  @IsDateString() horaLlegada: string;
  @IsInt() @Type(() => Number) bloqueHorario: number;
  @IsEnum(TipoAtrasoEnum) tipo: TipoAtrasoEnum;
  @IsOptional() @IsBoolean() @Type(() => Boolean) justificado?: boolean;
  @IsOptional() @IsString() justificacion?: string;
}

export class AtrasoQueryDto {
  @IsOptional() @IsString() alumnoId?: string;
  @IsOptional() @IsString() cursoId?: string;
  @IsOptional() @IsDateString() fechaDesde?: string;
  @IsOptional() @IsDateString() fechaHasta?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit?: number;
}

export class ReporteAtrasoQueryDto {
  @IsOptional() @IsInt() @Min(1) @Max(12) @Type(() => Number) mes?: number;
  @IsOptional() @IsInt() @Type(() => Number) anio?: number;
  @IsOptional() @IsString() cursoId?: string;
}
