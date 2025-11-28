import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RegisterUserDto, LoginUserDto } from './dto';
import { PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload';
import { envs } from 'src/config';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {

    private readonly logger = new Logger('AuthService');

    constructor(private readonly jwtService: JwtService) {
        super();
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('Connected to MongoDB');
    }

    async signJWT(payload: JwtPayload) {
        return this.jwtService.sign(payload);
    }

    async registerUser(registerUserDto: RegisterUserDto) {
        const { name, email, password } = registerUserDto;
        try {
            const user = await this.user.findUnique({
                where: {
                    email,
                },
            });
            if (user) {
                throw new RpcException({ status: HttpStatus.BAD_REQUEST, message: 'Email already registered' });
            }
        
            const newUser =  await this.user.create({
                data: {
                    name,
                    email,
                    password: bcrypt.hashSync(password, 10),
                }
            });
            const { password: _, ...userWithoutPassword } = newUser;
            return {
                ...userWithoutPassword,
                token: await this.signJWT({ 
                    ...userWithoutPassword,
                 }),
            }
        } catch (error) {
            throw new RpcException({ status: HttpStatus.BAD_REQUEST, message: 'Invalid user data' });
        }
    }
    async loginUser(loginUserDto: LoginUserDto) {
        const { email, password } = loginUserDto;
        try {
            const user = await this.user.findUnique({
                where: {
                    email,
                },
            });
            if (!user) {
                throw new RpcException({ status: HttpStatus.BAD_REQUEST, message: 'Invalid credentials' });
            }
            const isPasswordValid = bcrypt.compareSync(password, user.password);
            if (!isPasswordValid) {
                throw new RpcException({ status: HttpStatus.BAD_REQUEST, message: 'Invalid credentials' });
            }
            const { password: _, ...userWithoutPassword } = user;
            return {
                ...userWithoutPassword,
                token: await this.signJWT({ 
                    ...userWithoutPassword,
                 }),
            }
        } catch (error) {
            throw new RpcException({ status: HttpStatus.BAD_REQUEST, message: 'Invalid credentials' });
        }
    }

    async verifyToken(token: string) {
    try {
      
      const { sub, iat, exp, ...user } = this.jwtService.verify(token, {
        secret: envs.jwtSecret,
      });

      return {
        user: user,
        token: await this.signJWT(user),
      }

    } catch (error) {
      console.log(error);
      throw new RpcException({
        status: 401,
        message: 'Invalid token'
      })
    }

  }
}
