import {
  IsString, IsOptional, IsEmail, IsNotEmpty, IsInt, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApoderadoV2Dto {
  @IsString() @IsNotEmpty() run: string;
  @IsString() @IsNotEmpty() nombres: string;
  @IsString() @IsNotEmpty() apellidoPaterno: string;
  @IsString() @IsNotEmpty() apellidoMaterno: string;
  @IsString() @IsNotEmpty() telefono: string;
  @IsOptional() @IsString() telefonoAlt?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() comuna?: string;
  @IsOptional() @IsString() ocupacion?: string;
  @IsString() @IsNotEmpty() parentesco: string; // padre, madre, tutor, abuelo, otro
}

export class UpdateApoderadoDto {
  @IsOptional() @IsString() nombres?: string;
  @IsOptional() @IsString() apellidoPaterno?: string;
  @IsOptional() @IsString() apellidoMaterno?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() telefonoAlt?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() comuna?: string;
  @IsOptional() @IsString() ocupacion?: string;
  @IsOptional() @IsString() parentesco?: string;
}

export class ApoderadoQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit?: number;
}

export class CreateContactoEmergenciaDto {
  @IsString() @IsNotEmpty() nombre: string;
  @IsString() @IsNotEmpty() telefono: string;
  @IsString() @IsNotEmpty() parentesco: string;
  @IsOptional() @IsInt() @Type(() => Number) prioridad?: number;
}
