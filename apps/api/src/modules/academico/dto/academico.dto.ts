import {
  IsString, IsOptional, IsInt, IsNumber, IsBoolean,
  IsArray, ValidateNested, Min, Max, IsDateString, IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── ASIGNATURAS ──────────────────────────────────────────────

export class CreateAsignaturaDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() codigo?: string;
  @IsInt() @Min(1) @Max(40) @Type(() => Number) horasSemanales: number;
  @IsOptional() @IsString() planEstudios?: string;
  @IsOptional() @IsString() tipo?: string;     // ASIGNATURA | TALLER | ELECTIVO
  @IsOptional() @IsBoolean() activa?: boolean;
}

export class UpdateAsignaturaDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsInt() @Min(1) @Max(40) @Type(() => Number) horasSemanales?: number;
  @IsOptional() @IsString() planEstudios?: string;
  @IsOptional() @IsString() tipo?: string;
  @IsOptional() @IsBoolean() activa?: boolean;
}

// ─── DOCENTES-CURSO ───────────────────────────────────────────

export class AsignaturaDocenteDto {
  @IsString() asignaturaId: string;
  @IsString() funcionarioId: string;
  @IsString() cursoId: string;
  @IsInt() @Type(() => Number) anio: number;
}

// ─── EVALUACIONES ─────────────────────────────────────────────

export enum TipoEvaluacionEnum {
  PRUEBA = 'PRUEBA',
  TRABAJO = 'TRABAJO',
  TAREA = 'TAREA',
  EXPOSICION = 'EXPOSICION',
  EXAMEN = 'EXAMEN',
}

export enum EstadoEvaluacionEnum {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

export class CreateEvaluacionDto {
  @IsString() asignaturaId: string;
  @IsString() cursoId: string;
  @IsString() nombre: string;
  @IsEnum(TipoEvaluacionEnum) tipo: TipoEvaluacionEnum;
  @IsNumber() @Min(0.01) @Max(100) @Type(() => Number) ponderacion: number;
  @IsOptional() @IsDateString() fechaAplicacion?: string;
  @IsInt() @Min(1) @Max(2) @Type(() => Number) semestre: number;
  @IsInt() @Type(() => Number) anio: number;
}

export class UpdateEvaluacionDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsEnum(TipoEvaluacionEnum) tipo?: TipoEvaluacionEnum;
  @IsOptional() @IsNumber() @Min(0.01) @Max(100) @Type(() => Number) ponderacion?: number;
  @IsOptional() @IsDateString() fechaAplicacion?: string;
  @IsOptional() @IsEnum(EstadoEvaluacionEnum) estado?: EstadoEvaluacionEnum;
}

export class EvaluacionQueryDto {
  @IsOptional() @IsString() cursoId?: string;
  @IsOptional() @IsString() asignaturaId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(2) @Type(() => Number) semestre?: number;
  @IsOptional() @IsInt() @Type(() => Number) anio?: number;
}

// ─── NOTAS ────────────────────────────────────────────────────

export class NotaIndividualDto {
  @IsString() alumnoId: string;
  @IsNumber() @Min(1) @Max(7) @Type(() => Number) valor: number;
  @IsOptional() @IsString() observacion?: string;
}

export class RegistrarNotasBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotaIndividualDto)
  notas: NotaIndividualDto[];
}
