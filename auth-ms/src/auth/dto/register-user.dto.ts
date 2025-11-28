import { IsEmail, IsStrongPassword } from "class-validator";
import { IsString } from "class-validator";



export class RegisterUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword()
  password: string;
}