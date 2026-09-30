// backend/nest-api/src/auth/dto/login-user.dto.ts

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: 'ایمیل وارد شده معتبر نیست.' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
  })
  password!: string;
}
