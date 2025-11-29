import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class HealthCheckController {
    @Get()
    checkHealth() {
        return "Payments Webhook is up and running"
    }    
}
