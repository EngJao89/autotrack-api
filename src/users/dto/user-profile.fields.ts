import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  digitsOnly,
  normalizePhone,
  resolveDocumentType,
} from '../utils/brazilian-documents';
import {
  IsBrazilianCnh,
  IsBrazilianDocument,
  IsE164Phone,
} from '../validators/is-brazilian-document.decorator';

const nullableTrim = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return value;
  return typeof value === 'string' ? value.trim() : value;
};

export class UserProfileFieldsDto {
  @ApiPropertyOptional({ example: 'Nome do usuário', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(nullableTrim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string | null;

  @ApiPropertyOptional({ example: '10000000091', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? digitsOnly(value) : value,
  )
  @IsString()
  @IsBrazilianCnh()
  cnh?: string | null;

  @ApiPropertyOptional({ example: '52998224725', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? digitsOnly(value) : value,
  )
  @IsString()
  @IsBrazilianDocument()
  document?: string | null;

  @ApiPropertyOptional({
    example: 'CPF',
    enum: ['CPF', 'CNPJ'],
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(({ value, obj }: { value: unknown; obj: UserProfileFieldsDto }) => {
    if (value === null || value === undefined) {
      if (typeof obj.document === 'string' && obj.document.length > 0) {
        return resolveDocumentType(obj.document, null);
      }
      return value;
    }
    return typeof value === 'string' ? value.trim().toUpperCase() : value;
  })
  @IsIn(['CPF', 'CNPJ'])
  documentType?: string | null;

  @ApiPropertyOptional({ example: '+5511999999999', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsString()
  @IsE164Phone()
  phone?: string | null;
}
