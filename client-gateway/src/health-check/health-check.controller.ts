import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class HealthCheckController {
    @Get()
    checkHealth() {
        return "Client Gateway is up and running"
    }    
}
