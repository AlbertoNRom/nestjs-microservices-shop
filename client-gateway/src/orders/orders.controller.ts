import { Controller, Get, Post, Body, Param, Inject, Query, Patch, ParseUUIDPipe } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { catchError, throwError } from 'rxjs';
import { PaginationDto } from '../common/dto/pagination.dto';
import { OrderPaginationDto, StatusDto } from './dto';



@Controller('orders')
export class OrdersController {
  constructor(@Inject('NATS_SERVICE') private readonly client: ClientProxy) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.client.send('create_order', createOrderDto);
  }

  @Get()
  async findAll(@Query() orderPaginationDto: OrderPaginationDto) {
    return this.client.send('find_all_orders', orderPaginationDto).pipe(
      catchError((err) => throwError(() => new RpcException(err)))        
    );
  }

  @Get('id/:id')
  async findOne(@Param('id') id: string) {
    return this.client.send('find_order',  id ).pipe(
      catchError((err) => throwError(() => new RpcException(err)))        
    );
  }

  @Get(':status')
  findByStatus(@Param() statusDto: StatusDto, @Query() paginationDto: PaginationDto) {
    return this.client.send('find_orders_by_status', { status: statusDto.status , ...paginationDto });
  }

  @Patch('id/:id')
  async changeOrderStatus(@Param('id', ParseUUIDPipe) id: string, @Body() statusDto: StatusDto) {
    return this.client.send('change_order_status', { id, ...statusDto }).pipe(
      catchError((err) => throwError(() => new RpcException(err)))        
    );
  }
}
