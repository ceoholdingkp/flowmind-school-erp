import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoPresupuesto {
  BORRADOR = 'BORRADOR',
  APROBADO = 'APROBADO',
  CERRADO = 'CERRADO',
}

export class PresupuestoLineaDto {
  @IsString()
  fondoId: string;

  @IsString()
  categoriaGasto: string;

  @IsNumber()
  @Min(0)
  montoAnual: number;

  @IsOptional()
  montoMensual?: number[];
}

export class CreatePresupuestoDto {
  @IsInt()
  @Min(2000)
  anio: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresupuestoLineaDto)
  lineas: PresupuestoLineaDto[];
}

export class AprobarPresupuestoDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ComparativaQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;

  @IsOptional()
  @IsString()
  fondoId?: string;
}
