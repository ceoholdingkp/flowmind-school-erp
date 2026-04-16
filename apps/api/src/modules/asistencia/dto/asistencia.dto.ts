import {
  IsString, IsOptional, IsInt, IsEnum, IsDateString,
  IsArray, ValidateNested, Min, Max, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoAsistenciaEnum {
  PRESENTE = 'PRESENTE',
  AUSENTE = 'AUSENTE',
  ATRASO = 'ATRASO',
  JUSTIFICADO = 'JUSTIFICADO',
  RETIRADO_ANTICIPADO = 'RETIRADO_ANTICIPADO',
}

export class RegistroIndividualDto {
  @IsString() alumnoId: string;
  @IsEnum(EstadoAsistenciaEnum) estado: EstadoAsistenciaEnum;
  @IsOptional() @IsString() justificacion?: string;
  @IsOptional() @IsString() horaLlegada?: string;   // ISO datetime string
  @IsOptional() @IsString() horaRetiro?: string;    // ISO datetime string
}

export class BulkAsistenciaDto {
  @IsString() cursoId: string;
  @IsDateString() fecha: string;
  @IsOptional() @IsInt() @Min(1) @Max(8) @Type(() => Number) tramoHorario?: number;
  @IsString() registradoPor: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistroIndividualDto)
  registros: RegistroIndividualDto[];
}

export class UpdateAsistenciaDto {
  @IsOptional() @IsEnum(EstadoAsistenciaEnum) estado?: EstadoAsistenciaEnum;
  @IsOptional() @IsString() justificacion?: string;
  @IsOptional() @IsString() documentoAdj?: string;
}

export class AsistenciaQueryDto {
  @IsOptional() @IsDateString() fecha?: string;
  @IsOptional() @IsInt() @Min(1) @Max(8) @Type(() => Number) tramoHorario?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) @Type(() => Number) mes?: number;
  @IsOptional() @IsInt() @Type(() => Number) anio?: number;
}
