import { IsEmail, IsStrongPassword } from "class-validator";
import { IsString } from "class-validator";


export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword()
  password: string;
}