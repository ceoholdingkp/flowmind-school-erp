import { IsString, IsOptional, IsInt, IsIn, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

const DIMENSIONES = ['Gestion Pedagogica', 'Liderazgo', 'Convivencia', 'Gestion Recursos'];
const ESTADOS_ACCION = ['PENDIENTE', 'EN_CURSO', 'COMPLETADA'];

export class CreatePMEDto {
  @IsInt() @Type(() => Number) anio: number;
}

export class UpdatePMEDto {
  @IsOptional() @IsIn(['BORRADOR', 'APROBADO', 'EN_EJECUCION', 'CERRADO']) estado?: string;
  @IsOptional() @IsString() aprobadoPor?: string;
}

export class CreateAccionPMEDto {
  @IsIn(DIMENSIONES) dimension: string;
  @IsString() objetivo: string;
  @IsOptional() @IsString() meta?: string;
  @IsOptional() @IsString() indicador?: string;
  @IsString() descripcion: string;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsDateString() fechaInicio?: string;
  @IsOptional() @IsDateString() fechaFin?: string;
  @IsOptional() @IsNumber() @Type(() => Number) presupuesto?: number;
  @IsOptional() @IsString() fondoId?: string;
}

export class UpdateAccionPMEDto {
  @IsOptional() @IsIn(DIMENSIONES) dimension?: string;
  @IsOptional() @IsString() objetivo?: string;
  @IsOptional() @IsString() meta?: string;
  @IsOptional() @IsString() indicador?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsNumber() @Type(() => Number) porcentajeAvance?: number;
  @IsOptional() @IsIn(ESTADOS_ACCION) estado?: string;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsDateString() fechaInicio?: string;
  @IsOptional() @IsDateString() fechaFin?: string;
}

export class AprobarPMEDto {
  @IsString() aprobadoPor: string;
}
