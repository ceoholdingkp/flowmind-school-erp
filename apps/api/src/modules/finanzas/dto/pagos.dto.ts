import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MetodoPago {
  WEBPAY = 'WEBPAY',
  KHIPU = 'KHIPU',
  FLOW = 'FLOW',
  TRANSFERENCIA = 'TRANSFERENCIA',
  EFECTIVO = 'EFECTIVO',
  CHEQUE = 'CHEQUE',
}

export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
  RECHAZADO = 'RECHAZADO',
  ANULADO = 'ANULADO',
}

export class CreatePagoDto {
  @IsString()
  alumnoId: string;

  @IsNumber()
  @Min(0)
  monto: number;

  @IsDateString()
  fecha: string;

  @IsEnum(MetodoPago)
  metodo: MetodoPago;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  cuotaNumero?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  mesCorresponde?: number;
}

export class UpdatePagoEstadoDto {
  @IsEnum(EstadoPago)
  estado: EstadoPago;

  @IsOptional()
  @IsString()
  referencia?: string;
}

export class WebhookPagoDto {
  @IsString()
  referencia: string;

  @IsEnum(EstadoPago)
  estado: EstadoPago;

  @IsOptional()
  @IsString()
  gatewayResponse?: string;
}

export class PagoQueryDto {
  @IsOptional()
  @IsString()
  alumnoId?: string;

  @IsOptional()
  @IsEnum(EstadoPago)
  estado?: EstadoPago;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mesCorresponde?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
