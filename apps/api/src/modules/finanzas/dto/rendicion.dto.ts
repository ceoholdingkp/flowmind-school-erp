import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PeriodoRendicion {
  MENSUAL = 'mensual',
  TRIMESTRAL = 'trimestral',
  ANUAL = 'anual',
}

export class CreateRendicionDto {
  @IsString()
  fondoId: string;

  @IsEnum(PeriodoRendicion)
  periodo: PeriodoRendicion;

  @IsInt()
  @Min(1)
  @Max(12)
  mesInicio: number;

  @IsInt()
  @Min(1)
  @Max(12)
  mesFin: number;

  @IsInt()
  @Min(2000)
  anio: number;
}

export class AprobarRendicionDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class EnviarRendicionDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class RendicionQueryDto {
  @IsOptional()
  @IsString()
  fondoId?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}
