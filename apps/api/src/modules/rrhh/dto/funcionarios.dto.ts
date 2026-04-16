import {
  IsString, IsEnum, IsOptional, IsNumber, IsDateString,
  IsInt, Min, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoFuncionario {
  DOCENTE = 'DOCENTE',
  ASISTENTE_PROFESIONAL = 'ASISTENTE_PROFESIONAL',
  PARADOCENTE = 'PARADOCENTE',
  AUXILIAR = 'AUXILIAR',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
  DIRECTIVO = 'DIRECTIVO',
}

export enum TramoCarrera {
  INICIAL = 'INICIAL',
  TEMPRANO = 'TEMPRANO',
  AVANZADO = 'AVANZADO',
  EXPERTO_I = 'EXPERTO_I',
  EXPERTO_II = 'EXPERTO_II',
}

export enum TipoContrato {
  INDEFINIDO = 'INDEFINIDO',
  PLAZO_FIJO = 'PLAZO_FIJO',
  REEMPLAZO = 'REEMPLAZO',
  HONORARIOS = 'HONORARIOS',
}

export enum EstadoFuncionario {
  ACTIVO = 'ACTIVO',
  CON_LICENCIA = 'CON_LICENCIA',
  DESVINCULADO = 'DESVINCULADO',
}

export class CreateFuncionarioDto {
  @IsString()
  run: string;

  @IsString()
  nombres: string;

  @IsString()
  apellidos: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsEnum(TipoFuncionario)
  tipo: TipoFuncionario;

  @IsString()
  cargo: string;

  @IsOptional()
  @IsString()
  tituloProfesional?: string;

  @IsOptional()
  @IsString()
  universidad?: string;

  @IsOptional()
  @IsString()
  especialidadPIE?: string;

  @IsOptional()
  @IsEnum(TramoCarrera)
  tramoCarrera?: TramoCarrera;

  @IsInt()
  @Min(1)
  horasContrato: number;

  @IsOptional()
  @IsInt()
  horasLectivas?: number;

  @IsOptional()
  @IsInt()
  horasNoLectivas?: number;

  @IsEnum(TipoContrato)
  tipoContrato: TipoContrato;

  @IsDateString()
  fechaIngreso: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sueldoBase?: number;

  @IsOptional()
  @IsString()
  afp?: string;

  @IsOptional()
  @IsString()
  isapre?: string;

  @IsOptional()
  @IsString()
  cuentaBancaria?: string;

  @IsOptional()
  @IsString()
  banco?: string;
}

export class UpdateFuncionarioDto {
  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsEnum(TipoFuncionario)
  tipo?: TipoFuncionario;

  @IsOptional()
  @IsString()
  tituloProfesional?: string;

  @IsOptional()
  @IsString()
  universidad?: string;

  @IsOptional()
  @IsString()
  especialidadPIE?: string;

  @IsOptional()
  @IsEnum(TramoCarrera)
  tramoCarrera?: TramoCarrera;

  @IsOptional()
  @IsInt()
  horasContrato?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sueldoBase?: number;

  @IsOptional()
  @IsString()
  afp?: string;

  @IsOptional()
  @IsString()
  isapre?: string;

  @IsOptional()
  @IsString()
  cuentaBancaria?: string;

  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsEnum(EstadoFuncionario)
  estado?: EstadoFuncionario;
}

export class FuncionarioQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(TipoFuncionario)
  tipo?: TipoFuncionario;

  @IsOptional()
  @IsEnum(EstadoFuncionario)
  estado?: EstadoFuncionario;

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
