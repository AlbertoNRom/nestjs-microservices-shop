import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {

  const logger = new Logger('Payments - MS');
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));


  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: envs.natsServers,
    }
  },{
      inheritAppConfig: true,
  });

  await app.startAllMicroservices();

  await app.listen(envs.port);

  logger.log(`Payments - MS Listening on port ${envs.port}`);
}
bootstrap();
