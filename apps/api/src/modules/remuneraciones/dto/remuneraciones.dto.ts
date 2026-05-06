import {
  IsString, IsInt, IsOptional, IsNumber, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenerarMesDto {
  @IsInt() @Min(1) @Max(12) @Type(() => Number) mes: number;
  @IsInt() @Min(2020) @Type(() => Number) anio: number;
}

export class LiquidacionesQueryDto {
  @IsOptional() @IsInt() @Min(1) @Max(12) @Type(() => Number) mes?: number;
  @IsOptional() @IsInt() @Min(2020) @Type(() => Number) anio?: number;
  @IsOptional() @IsString() estado?: string;
}

export class AprobacionMesDto {
  @IsInt() @Min(1) @Max(12) @Type(() => Number) mes: number;
  @IsInt() @Min(2020) @Type(() => Number) anio: number;
}

export class MarcarPagadasDto {
  @IsInt() @Min(1) @Max(12) @Type(() => Number) mes: number;
  @IsInt() @Min(2020) @Type(() => Number) anio: number;
}

export class UpdateLiquidacionDto {
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) sueldoBase?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) asignacionFamiliar?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) bonoZona?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) horasExtra?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) otrosHaberes?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) otrosDescuentos?: number;
}

export class UpdateConfiguracionDto {
  @IsOptional() @IsNumber() @Min(0) @Max(30) @Type(() => Number) tasa?: number;
  @IsOptional() @Type(() => Boolean) vigente?: boolean;
}
