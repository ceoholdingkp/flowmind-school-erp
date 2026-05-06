import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrarMovimientoSupereducDto {
  @IsString()
  @IsNotEmpty()
  supereducCuentaCodigo: string;

  @IsString()
  @IsNotEmpty()
  fondoId: string;

  @IsString()
  @IsNotEmpty()
  subvencion: string; // GENERAL, SEP, PIE, PRO_RETENCION, etc.

  @IsString()
  @IsNotEmpty()
  tipoDocumento: string; // BOL, BOLE, FAC, FACE, BHE, etc.

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  monto: number;

  @IsDateString()
  fecha: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mes: number;

  @IsInt()
  @Min(2000)
  @Type(() => Number)
  anio: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  numeroFactura?: string;

  @IsOptional()
  @IsString()
  rutProveedor?: string;

  @IsOptional()
  @IsString()
  proveedorId?: string;
}
