import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { Transport } from '@nestjs/microservices';
import { envs } from 'src/config';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: NATS_SERVICE,
                transport: Transport.NATS,
                options: {
                    servers: envs.natsServers,
                },
            },
        ]),
    ],
    exports: [
        ClientsModule.register([
            {
                name: NATS_SERVICE,
                transport: Transport.NATS,
                options: {
                    servers: envs.natsServers,
                },
            },
        ]),
    ]
})
export class NatsModule {}
