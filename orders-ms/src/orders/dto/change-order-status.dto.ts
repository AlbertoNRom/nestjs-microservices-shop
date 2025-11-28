import { OrderStatus } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";
import { OrderStatusList } from "../enum/order.enum";



export class ChangeOrderDto {
  @IsUUID(4)
  id: string;
  
  @IsEnum(OrderStatusList, {
    message: 'status must be a valid order status',
  })
  status: OrderStatus;
}