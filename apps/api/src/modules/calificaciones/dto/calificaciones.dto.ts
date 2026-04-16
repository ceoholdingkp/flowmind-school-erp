import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoNota {
  SUMATIVA = 'SUMATIVA',
  FORMATIVA = 'FORMATIVA',
  TALLER = 'TALLER',
  EXAMEN = 'EXAMEN',
}

export class CreateNotaDto {
  @IsString()
  alumnoId: string;

  @IsString()
  asignaturaId: string;

  @IsEnum(TipoNota)
  tipo: TipoNota;

  @IsString()
  nombreEvaluacion: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  ponderacion: number;

  @IsNumber()
  @Min(1)
  @Max(7)
  valor: number;

  @IsDateString()
  fecha: string;

  @IsInt()
  @Min(1)
  @Max(2)
  semestre: number;

  @IsInt()
  @Min(2000)
  anio: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class UpdateNotaDto {
  @IsOptional()
  @IsEnum(TipoNota)
  tipo?: TipoNota;

  @IsOptional()
  @IsString()
  nombreEvaluacion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ponderacion?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  valor?: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class BulkCreateNotaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNotaDto)
  notas: CreateNotaDto[];
}

export class NotaQueryDto {
  @IsOptional()
  @IsString()
  alumnoId?: string;

  @IsOptional()
  @IsString()
  asignaturaId?: string;

  @IsOptional()
  @IsString()
  cursoId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semestre?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;

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

export class CerrarPeriodoDto {
  @IsInt()
  @Min(1)
  @Max(2)
  semestre: number;

  @IsInt()
  @Min(2000)
  anio: number;

  @IsOptional()
  @IsString()
  cursoId?: string;

  @IsOptional()
  @IsString()
  asignaturaId?: string;
}

export class DashboardNotasQueryDto {
  @IsOptional()
  @IsString()
  cursoId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semestre?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}
