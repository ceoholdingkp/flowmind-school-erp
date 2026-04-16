import { IsString, IsOptional, IsInt, IsEnum, IsNumber, Min, Max, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCursoDto {
  @IsString() nombre: string;
  @IsString() nivel: string;
  @IsString() letra: string;
  @IsString() tipoEnsenanza: string;
  @IsInt() @Type(() => Number) capacidad: number;
  @IsInt() @Type(() => Number) anio: number;
  @IsOptional() @IsString() docenteJefeId?: string;
}

export class UpdateCursoDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() nivel?: string;
  @IsOptional() @IsString() letra?: string;
  @IsOptional() @IsString() tipoEnsenanza?: string;
  @IsOptional() @IsInt() @Type(() => Number) capacidad?: number;
  @IsOptional() @IsString() docenteJefeId?: string;
}

export class CreateAsignaturaDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() codigo?: string;
  @IsInt() @Type(() => Number) horasSemanales: number;
  @IsOptional() @IsString() planEstudios?: string;
}

export class UpdateAsignaturaDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() codigo?: string;
  @IsOptional() @IsInt() @Type(() => Number) horasSemanales?: number;
  @IsOptional() @IsString() planEstudios?: string;
}

export class CreateSalaDto {
  @IsString() nombre: string;
  @IsOptional() @IsInt() @Type(() => Number) capacidad?: number;
  @IsOptional() @IsString() tipo?: string;
  @IsString() establecimientoId: string;
}

export class UpdateSalaDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsInt() @Type(() => Number) capacidad?: number;
  @IsOptional() @IsString() tipo?: string;
}

export class UpdateEstablecimientoDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() comuna?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(7) @Type(() => Number) escalaMin?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(7) @Type(() => Number) escalaMax?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(7) @Type(() => Number) notaAprobacion?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number) asistenciaMinima?: number;
}
