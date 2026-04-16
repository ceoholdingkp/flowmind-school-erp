import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsInt,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProveedorDto {
  @IsString()
  rut: string;

  @IsString()
  razonSocial: string;

  @IsOptional()
  @IsString()
  giro?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  contactoNombre?: string;

  @IsOptional()
  @IsString()
  cuentaBancaria?: string;

  @IsOptional()
  @IsString()
  banco?: string;
}

export class UpdateProveedorDto {
  @IsOptional()
  @IsString()
  razonSocial?: string;

  @IsOptional()
  @IsString()
  giro?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  contactoNombre?: string;

  @IsOptional()
  @IsString()
  cuentaBancaria?: string;

  @IsOptional()
  @IsString()
  banco?: string;
}

export enum EstadoContrato {
  VIGENTE = 'VIGENTE',
  TERMINADO = 'TERMINADO',
  POR_VENCER = 'POR_VENCER',
}

export class CreateContratoDto {
  @IsString()
  tipoServicio: string;

  @IsOptional()
  @IsString()
  numeroContrato?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoMensual?: number;

  @IsDateString()
  fechaInicio: string;

  @IsOptional()
  @IsDateString()
  fechaTermino?: string;

  @IsOptional()
  @IsString()
  fondoImputacion?: string;
}

export class ProveedorQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

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
