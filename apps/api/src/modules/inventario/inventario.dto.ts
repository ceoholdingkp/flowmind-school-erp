import { IsString, IsOptional, IsIn, IsDateString, IsInt, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

const CATEGORIAS = ['TECNOLOGICO', 'FUNGIBLE', 'MOBILIARIO', 'ACTIVO_FIJO'];
const ESTADOS = ['BUENO', 'REGULAR', 'MALO', 'DADO_DE_BAJA'];

export class CreateBienDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsIn(CATEGORIAS) categoria: string;
  @IsOptional() @IsString() marca?: string;
  @IsOptional() @IsString() modelo?: string;
  @IsOptional() @IsString() numeroSerie?: string;
  @IsOptional() @IsString() salaId?: string;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsIn(ESTADOS) estado?: string;
  @IsNumber() @Type(() => Number) valorAdquisicion: number;
  @IsDateString() fechaAdquisicion: string;
  @IsOptional() @IsString() fondoCompra?: string;
  @IsOptional() @IsString() numeroFactura?: string;
  @IsOptional() @IsInt() @Type(() => Number) vidaUtilAnios?: number;
  @IsOptional() @IsString() foto?: string;
}

export class UpdateBienDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsIn(CATEGORIAS) categoria?: string;
  @IsOptional() @IsString() marca?: string;
  @IsOptional() @IsString() modelo?: string;
  @IsOptional() @IsString() salaId?: string;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsIn(ESTADOS) estado?: string;
  @IsOptional() @IsString() foto?: string;
}

export class DarDeBajaDto {
  @IsString() motivoBaja: string;
}

export class BienQueryDto {
  @IsOptional() @IsIn(CATEGORIAS) categoria?: string;
  @IsOptional() @IsIn(ESTADOS) estado?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() salaId?: string;
}
