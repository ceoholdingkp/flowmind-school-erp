import {
  IsString, IsInt, IsOptional, IsBoolean, IsDateString,
  IsNumber, Min, Max, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CrearMatriculaDto {
  @IsString() @IsNotEmpty() alumnoId: string;
  @IsInt() @Min(2020) @Max(2040) @Type(() => Number) anio: number;
  @IsString() @IsNotEmpty() curso: string;         // "1A", "2B"
  @IsString() @IsNotEmpty() nivel: string;          // "1° Básico"
  @IsOptional() @IsString() cursoId?: string;
  @IsOptional() @IsInt() @Type(() => Number) numeroMatricula?: number;
  @IsOptional() @IsDateString() fechaMatricula?: string;
  @IsOptional() @IsString() procedencia?: string;
  @IsOptional() @IsNumber() @Type(() => Number) becaPorcentaje?: number;
  @IsOptional() @IsBoolean() @Type(() => Boolean) prioritario?: boolean;
  @IsOptional() @IsBoolean() @Type(() => Boolean) preferente?: boolean;
  @IsOptional() @IsBoolean() @Type(() => Boolean) pie?: boolean;
  @IsOptional() @IsString() pieDiagnostico?: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) repitente?: boolean;
}

export class ActualizarMatriculaDto {
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsDateString() fechaRetiro?: string;
  @IsOptional() @IsString() motivoRetiro?: string;
  @IsOptional() @IsString() curso?: string;
  @IsOptional() @IsString() nivel?: string;
  @IsOptional() @IsString() cursoId?: string;
  @IsOptional() @IsNumber() @Type(() => Number) becaPorcentaje?: number;
  @IsOptional() @IsBoolean() @Type(() => Boolean) prioritario?: boolean;
  @IsOptional() @IsBoolean() @Type(() => Boolean) preferente?: boolean;
  @IsOptional() @IsBoolean() @Type(() => Boolean) pie?: boolean;
  @IsOptional() @IsString() pieDiagnostico?: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) repitente?: boolean;
}

export class MatriculaQueryDto {
  @IsOptional() @IsInt() @Min(2020) @Max(2040) @Type(() => Number) anio?: number;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() curso?: string;
  @IsOptional() @IsString() nivel?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit?: number;
}
