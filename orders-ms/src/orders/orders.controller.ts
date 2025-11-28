import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderDto } from './dto';
import { PaidOrderDto } from './dto/paid-order.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('create_order')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order =  await this.ordersService.create(createOrderDto);

    const paymentSession = await this.ordersService.createPaymentSession(order);

    return {
      order,
      paymentSession,
    };
  }

  @MessagePattern('find_all_orders')
  findAll(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern('find_order')
  findOne(@Payload() id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern('change_order_status')
  changeOrderStatus(@Payload() changeOrderDto: ChangeOrderDto) {
    return this.ordersService.changeOrderStatus(changeOrderDto);
       
  }

  @MessagePattern('find_orders_by_status')
  findByStatus(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findByStatus(orderPaginationDto);
  }


  @EventPattern('payment.succeeded')
  paidOrder(@Payload() payload: PaidOrderDto) {
    console.log({ method: 'paidOrder', payload });
    return this.ordersService.paidOrder(payload);
  }
}
