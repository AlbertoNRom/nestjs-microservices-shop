import { IsEnum, IsOptional } from "class-validator";
import { OrderStatus } from "../enum/orders.enum";

export class StatusDto {

    @IsOptional()
    @IsEnum(OrderStatus, {
        message: 'status must be a valid order status',
    })
    status: OrderStatus;
}