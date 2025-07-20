// src/auth/dto/login-user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: 'ایمیل وارد شده معتبر نیست.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' })
  password: string;
}
