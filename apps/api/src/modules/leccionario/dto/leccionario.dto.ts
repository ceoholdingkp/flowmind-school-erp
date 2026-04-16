import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoLeccionario {
  PENDIENTE = 'PENDIENTE',
  FIRMADO = 'FIRMADO',
  REVISADO_UTP = 'REVISADO_UTP',
}

export class CreateLeccionarioDto {
  @IsString()
  cursoId: string;

  @IsString()
  asignaturaId: string;

  @IsString()
  docenteId: string;

  @IsDateString()
  fecha: string;

  @IsInt()
  @Min(1)
  @Max(8)
  bloqueHorario: number;

  @IsOptional()
  @IsString()
  horaInicio?: string;

  @IsOptional()
  @IsString()
  horaFin?: string;

  @IsOptional()
  @IsString()
  objetivo?: string;

  @IsString()
  contenido: string;

  @IsOptional()
  @IsString()
  actividades?: string;

  @IsOptional()
  @IsString()
  recursos?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  planificacionId?: string;
}

export class UpdateLeccionarioDto {
  @IsOptional()
  @IsString()
  objetivo?: string;

  @IsOptional()
  @IsString()
  contenido?: string;

  @IsOptional()
  @IsString()
  actividades?: string;

  @IsOptional()
  @IsString()
  recursos?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class RevisarLeccionarioDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class LeccionarioQueryDto {
  @IsOptional()
  @IsString()
  cursoId?: string;

  @IsOptional()
  @IsString()
  docenteId?: string;

  @IsOptional()
  @IsString()
  asignaturaId?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsEnum(EstadoLeccionario)
  estado?: EstadoLeccionario;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ResumenDocenteQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}
