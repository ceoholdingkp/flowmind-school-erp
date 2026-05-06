import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum TipoComunicado {
  CIRCULAR = 'CIRCULAR',
  AVISO = 'AVISO',
  REUNION = 'REUNION',
  EMERGENCIA = 'EMERGENCIA',
  ACADEMICO = 'ACADEMICO',
}

export enum PrioridadComunicado {
  NORMAL = 'NORMAL',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
}

export enum DestinatariosComunicado {
  TODOS = 'TODOS',
  CURSO = 'CURSO',
  NIVEL = 'NIVEL',
  INDIVIDUAL = 'INDIVIDUAL',
}

export class CreateComunicadoDto {
  @IsString()
  titulo: string;

  @IsString()
  contenido: string;

  @IsEnum(TipoComunicado)
  tipo: TipoComunicado;

  @IsOptional()
  @IsEnum(PrioridadComunicado)
  prioridad?: PrioridadComunicado;

  @IsEnum(DestinatariosComunicado)
  destinatarios: DestinatariosComunicado;

  @IsOptional()
  @IsString()
  cursoId?: string;

  @IsOptional()
  @IsDateString()
  fechaExpiracion?: string;

  @IsOptional()
  @IsString()
  adjuntoUrl?: string;
}

export class UpdateComunicadoDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  contenido?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsDateString()
  fechaExpiracion?: string;
}

export class CreateMensajeDto {
  @IsString()
  alumnoId: string;

  @IsString()
  destinatarioId: string;

  @IsString()
  asunto: string;

  @IsString()
  contenido: string;
}

export class ComunicadoQueryDto {
  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  mes?: string;

  @IsOptional()
  @IsString()
  anio?: string;
}
