import {
  IsString, IsEnum, IsOptional, IsDateString, IsInt, IsNumber, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoDia {
  NORMAL = 'NORMAL',
  LICENCIA_MEDICA = 'LICENCIA_MEDICA',
  PERMISO = 'PERMISO',
  FERIADO = 'FERIADO',
  VACACIONES = 'VACACIONES',
  AUSENTE_INJUSTIFICADO = 'AUSENTE_INJUSTIFICADO',
}

export class MarcarEntradaDto {
  @IsDateString()
  horaEntrada: string; // ISO datetime string

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class MarcarSalidaDto {
  @IsDateString()
  horaSalida: string; // ISO datetime string

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class RegistrarLicenciaDto {
  @IsDateString()
  fecha: string;

  @IsEnum(TipoDia)
  tipoDia: TipoDia;

  @IsOptional()
  @IsString()
  licenciaTipo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  licenciaDias?: number;

  @IsOptional()
  @IsString()
  licenciaFolio?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class AsistenciaRRHHQueryDto {
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}
