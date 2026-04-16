import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

const CATEGORIAS = ['academico', 'administrativo', 'financiero', 'comunitario'];
const RECURRENCIAS = ['ninguna', 'diaria', 'semanal', 'mensual', 'anual'];
const AUDIENCIAS = ['todos', 'docentes', 'apoderados', 'administrativos'];

export class CreateEventoDto {
  @IsString() titulo: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsDateString() fechaInicio: string;
  @IsOptional() @IsDateString() fechaFin?: string;
  @IsIn(CATEGORIAS) categoria: string;
  @IsOptional() @IsIn(RECURRENCIAS) recurrencia?: string;
  @IsOptional() @IsIn(AUDIENCIAS) audiencia?: string;
  @IsOptional() @IsString() ubicacion?: string;
  @IsOptional() @IsString() color?: string;
}

export class UpdateEventoDto {
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsDateString() fechaInicio?: string;
  @IsOptional() @IsDateString() fechaFin?: string;
  @IsOptional() @IsIn(CATEGORIAS) categoria?: string;
  @IsOptional() @IsIn(RECURRENCIAS) recurrencia?: string;
  @IsOptional() @IsIn(AUDIENCIAS) audiencia?: string;
  @IsOptional() @IsString() ubicacion?: string;
  @IsOptional() @IsString() color?: string;
}

export class EventoQueryDto {
  @IsOptional() @IsIn(CATEGORIAS) categoria?: string;
  @IsOptional() @IsIn(AUDIENCIAS) audiencia?: string;
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
}
