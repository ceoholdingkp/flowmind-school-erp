import {
  IsString, IsEnum, IsOptional, IsNumber, IsDateString, IsInt, Min, IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoContrato {
  INDEFINIDO = 'INDEFINIDO',
  PLAZO_FIJO = 'PLAZO_FIJO',
  REEMPLAZO = 'REEMPLAZO',
  HONORARIOS = 'HONORARIOS',
}

export class CreateContratoLaboralDto {
  @IsEnum(TipoContrato)
  tipo: TipoContrato;

  @IsString()
  cargo: string;

  @IsOptional()
  @IsString()
  funciones?: string;

  @IsInt()
  @Min(1)
  horasSemanales: number;

  @IsNumber()
  @Min(0)
  sueldoBruto: number;

  @IsDateString()
  fechaInicio: string;

  @IsOptional()
  @IsDateString()
  fechaTermino?: string;

  @IsOptional()
  @IsString()
  documento?: string;
}

export class UpdateContratoLaboralDto {
  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  funciones?: string;

  @IsOptional()
  @IsInt()
  horasSemanales?: number;

  @IsOptional()
  @IsNumber()
  sueldoBruto?: number;

  @IsOptional()
  @IsDateString()
  fechaTermino?: string;

  @IsOptional()
  @IsString()
  estado?: string;
}

export class AddAnexoDto {
  @IsDateString()
  fecha: string;

  @IsString()
  descripcion: string;

  @IsOptional()
  @IsString()
  documento?: string;
}

export class TerminarContratoDto {
  @IsDateString()
  fechaTermino: string;

  @IsString()
  causalTermino: string;

  @IsOptional()
  @IsString()
  finiquito?: string;
}

export class ContratoQueryDto {
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
