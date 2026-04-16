import {
  IsString, IsOptional, IsBoolean, IsInt, IsEnum,
  IsEmail, IsDateString, IsNumber, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoMatriculaEnum {
  ACTIVA = 'ACTIVA',
  RETIRADO = 'RETIRADO',
  TRASLADADO = 'TRASLADADO',
  SUSPENDIDA = 'SUSPENDIDA',
}

export enum GeneroEnum {
  MASCULINO = 'MASCULINO',
  FEMENINO = 'FEMENINO',
  OTRO = 'OTRO',
}

export class CreateAlumnoDto {
  @IsString() run: string;
  @IsString() nombres: string;
  @IsString() apellidoPaterno: string;
  @IsString() apellidoMaterno: string;
  @IsDateString() fechaNacimiento: string;
  @IsEnum(GeneroEnum) genero: GeneroEnum;
  @IsOptional() @IsString() nacionalidad?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() comuna?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() cursoId?: string;
  @IsDateString() fechaMatricula: string;
  @IsInt() @Type(() => Number) numeroMatricula: number;
  @IsOptional() @IsBoolean() @Type(() => Boolean) esPIE?: boolean;
  @IsOptional() @IsBoolean() @Type(() => Boolean) esPrioritario?: boolean;
  @IsOptional() @IsBoolean() @Type(() => Boolean) esPreferente?: boolean;
  @IsOptional() @IsString() grupoSanguineo?: string;
  @IsOptional() @IsString() previsionSalud?: string;
  @IsOptional() @IsString() alergias?: string;
  @IsOptional() @IsString() enfermedadesCronicas?: string;
  @IsOptional() @IsString() medicamentos?: string;
  @IsOptional() @IsString() colegioAnterior?: string;
}

export class UpdateAlumnoDto {
  @IsOptional() @IsString() nombres?: string;
  @IsOptional() @IsString() apellidoPaterno?: string;
  @IsOptional() @IsString() apellidoMaterno?: string;
  @IsOptional() @IsDateString() fechaNacimiento?: string;
  @IsOptional() @IsEnum(GeneroEnum) genero?: GeneroEnum;
  @IsOptional() @IsString() nacionalidad?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() comuna?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() cursoId?: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) esPIE?: boolean;
  @IsOptional() @IsBoolean() @Type(() => Boolean) esPrioritario?: boolean;
  @IsOptional() @IsBoolean() @Type(() => Boolean) esPreferente?: boolean;
  @IsOptional() @IsString() grupoSanguineo?: string;
  @IsOptional() @IsString() previsionSalud?: string;
  @IsOptional() @IsString() alergias?: string;
  @IsOptional() @IsString() enfermedadesCronicas?: string;
  @IsOptional() @IsString() medicamentos?: string;
}

export class RetirarAlumnoDto {
  @IsString() motivoRetiro: string;
  @IsDateString() fechaRetiro: string;
  @IsOptional() @IsEnum({ RETIRADO: 'RETIRADO', TRASLADADO: 'TRASLADADO' })
  estado?: 'RETIRADO' | 'TRASLADADO';
}

export class CreateApoderadoDto {
  @IsString() run: string;
  @IsString() nombres: string;
  @IsString() apellidos: string;
  @IsString() telefono: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() ocupacion?: string;
  @IsString() parentesco: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) esTitular?: boolean;
  @IsOptional() @IsBoolean() @Type(() => Boolean) esEmergencia?: boolean;
}

export class AlumnoQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() cursoId?: string;
  @IsOptional() @IsEnum(EstadoMatriculaEnum) estado?: EstadoMatriculaEnum;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit?: number;
}
