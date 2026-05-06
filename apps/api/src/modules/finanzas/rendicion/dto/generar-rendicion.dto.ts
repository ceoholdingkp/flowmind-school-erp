import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenerarRendicionSupereducDto {
  @IsString()
  @IsNotEmpty()
  fondoId: string;

  @IsString()
  @IsNotEmpty()
  subvencion: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mesInicio: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mesFin: number;

  @IsInt()
  @Min(2000)
  @Type(() => Number)
  anio: number;
}
