import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';

const AREAS = ['ACADEMICA', 'FINANCIERA', 'LABORAL', 'CONVIVENCIA', 'INFRAESTRUCTURA'];
const ESTADOS = ['CUMPLIDO', 'PENDIENTE', 'VENCIDO', 'NO_APLICA'];

export class CreateItemCumplimientoDto {
  @IsIn(AREAS) area: string;
  @IsString() nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsString() normativaReferencia?: string;
  @IsOptional() @IsDateString() plazoLegal?: string;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsString() observaciones?: string;
}

export class UpdateItemCumplimientoDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsIn(ESTADOS) estado?: string;
  @IsOptional() @IsString() documentoRespaldo?: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsOptional() @IsString() responsableId?: string;
}

export class CreateFiscalizacionDto {
  @IsDateString() fecha: string;
  @IsString() entidad: string;
  @IsOptional() @IsString() fiscalizador?: string;
  @IsOptional() @IsString() hallazgos?: string;
  @IsOptional() @IsString() compromisos?: string;
  @IsOptional() @IsDateString() plazoSubsanacion?: string;
}

export class UpdateFiscalizacionDto {
  @IsOptional() @IsString() hallazgos?: string;
  @IsOptional() @IsString() compromisos?: string;
  @IsOptional() @IsIn(['PENDIENTE', 'SUBSANADO', 'VENCIDO']) estadoSubsanacion?: string;
  @IsOptional() @IsDateString() plazoSubsanacion?: string;
}

export class ItemQueryDto {
  @IsOptional() @IsIn(AREAS) area?: string;
  @IsOptional() @IsIn(ESTADOS) estado?: string;
}
