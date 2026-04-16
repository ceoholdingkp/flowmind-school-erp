import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsInt,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoAnotacion {
  POSITIVA = 'POSITIVA',
  NEGATIVA = 'NEGATIVA',
}

export enum Gravedad {
  LEVE = 'LEVE',
  GRAVE = 'GRAVE',
  GRAVISIMA = 'GRAVISIMA',
}

export class CreateAnotacionDto {
  @IsString()
  alumnoId: string;

  @IsEnum(TipoAnotacion)
  tipo: TipoAnotacion;

  @IsOptional()
  @IsEnum(Gravedad)
  gravedad?: Gravedad;

  @IsString()
  categoria: string;

  @IsString()
  descripcion: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsString()
  protocoloActivo?: string;

  @IsOptional()
  @IsBoolean()
  visiblePortal?: boolean;
}

export class UpdateAnotacionDto {
  @IsOptional()
  @IsEnum(TipoAnotacion)
  tipo?: TipoAnotacion;

  @IsOptional()
  @IsEnum(Gravedad)
  gravedad?: Gravedad;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsBoolean()
  visiblePortal?: boolean;
}

export class ActivarProtocoloDto {
  @IsString()
  tipoProtocolo: string;
}

export class AddEntrevistaDto {
  @IsDateString()
  fecha: string;

  @IsString()
  apoderado: string;

  @IsString()
  acuerdos: string;

  @IsOptional()
  @IsString()
  firma?: string;
}

export class AddCompromisoDto {
  @IsString()
  descripcion: string;

  @IsDateString()
  fechaLimite: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  seguimiento?: string;
}

export class UpdateCompromisoDto {
  @IsInt()
  @Min(0)
  indice: number;

  @IsString()
  estado: string;

  @IsOptional()
  @IsString()
  seguimiento?: string;
}

export class AnotacionQueryDto {
  @IsOptional()
  @IsString()
  alumnoId?: string;

  @IsOptional()
  @IsEnum(TipoAnotacion)
  tipo?: TipoAnotacion;

  @IsOptional()
  @IsString()
  cursoId?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsEnum(Gravedad)
  gravedad?: Gravedad;

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
