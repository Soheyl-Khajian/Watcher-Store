// backend/nest-api/src/orders/dto/create-order.dto.ts

import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsDefined,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { normalizeDigits } from '../../common/text/normalize';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimAndNormalizeDigits = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? normalizeDigits(value.trim()) : value;

// Optional fields: surrounding whitespace is removed and an empty value is
// treated as absent.
const optionalTrim = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === '' ? undefined : trimmed;
};

const optionalTrimAndNormalizeDigits = ({
  value,
}: TransformFnParams): unknown => {
  const trimmed = optionalTrim({ value } as TransformFnParams);

  return typeof trimmed === 'string' ? normalizeDigits(trimmed) : trimmed;
};

export class ShippingDetailsDto {
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  recipientName!: string;

  @Transform(trimAndNormalizeDigits)
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'phone must be an Iranian mobile number such as 09123456789',
  })
  phone!: string;

  @Transform(trim)
  @IsString()
  @Length(2, 50)
  province!: string;

  @Transform(trim)
  @IsString()
  @Length(2, 50)
  city!: string;

  @Transform(trim)
  @IsString()
  @Length(10, 500)
  address!: string;

  @Transform(trimAndNormalizeDigits)
  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'postalCode must be exactly 10 digits',
  })
  postalCode!: string;

  @IsOptional()
  @Transform(optionalTrimAndNormalizeDigits)
  @IsString()
  @Length(1, 20)
  unit?: string;

  @IsOptional()
  @Transform(optionalTrimAndNormalizeDigits)
  @IsString()
  @Length(1, 20)
  floor?: string;

  @IsOptional()
  @Transform(optionalTrim)
  @IsString()
  @Length(1, 500)
  deliveryNotes?: string;
}

export class CreateOrderDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ShippingDetailsDto)
  shipping!: ShippingDetailsDto;
}
