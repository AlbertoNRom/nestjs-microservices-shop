import { PaginationDto } from "src/common";
import { OrderStatus, OrderStatusList } from "../enum/orders.enum";
import { IsEnum, IsOptional } from "class-validator";


export class OrderPaginationDto extends PaginationDto {

    @IsOptional()
    @IsEnum(OrderStatusList, { message: 'Status must be a valid order status' })
    public status?: OrderStatus;
}