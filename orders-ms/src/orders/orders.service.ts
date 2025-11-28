import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PrismaClient } from '@prisma/client';
import { OnModuleInit } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';

import { ChangeOrderDto } from './dto';
import {  NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.inferface';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { PaidOrderDto } from './dto/paid-order.dto';


@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async create(createOrderDto: CreateOrderDto) {

    try{
    const productIds = createOrderDto.items.map((product) => product.productId);

    const validProducts = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, productIds)
    );

    if (!validProducts) {
      throw new RpcException({ status: HttpStatus.BAD_REQUEST, message: 'Invalid product ids' });
    }

    const totalAmount = createOrderDto.items.reduce((acc, item) => {
      const price = validProducts.find((product) => product.id === item.productId).price;
      return acc + item.quantity * price;
    }, 0);

    const totalItems = createOrderDto.items.reduce((acc, item) => {
      return acc + item.quantity;
    }, 0);


    const order =  await this.order.create({
      data: {
        totalAmount,
        totalItems,
        orderItems: {
          createMany: {
            data: createOrderDto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: validProducts.find((product) => product.id === item.productId).price,
            })),
          }
        }
      },
      include: {
        orderItems: {
          select: {
            productId: true,
            quantity: true,
            price: true,
          }
        }
      }
    });


    return {
      ...order,
      orderItems: order.orderItems.map((item) => ({
        ...item,
        name: validProducts.find((product) => product.id === item.productId).name,
      }))
    }

    } catch (error) {
      throw new RpcException({ status: HttpStatus.BAD_REQUEST, message: error.message });
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page, limit, status } = orderPaginationDto;

    const totalItems = await this.order.count({
      where: {
        status: status
      }
    });
    const totalPages = await Math.ceil(totalItems / limit);
    return {
      data: await this.order.findMany({
        skip: ((page ?? 1) - 1) * limit,
        take: limit,
        where: {
          status: status
        },
      }),
      meta: {
        totalItems,
        totalPages,
        currentPage: page ?? 1,
        limit,
      },
    };
  }

  async findByStatus(orderPaginationDto: OrderPaginationDto) { 
    return this.findAll(orderPaginationDto);
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: {
        id,
      },
      include: {
        orderItems: {
          select: {
            productId: true,
            quantity: true,
            price: true
          }
        }
      }
    });

    if (!order) {
      throw new RpcException({ status: HttpStatus.NOT_FOUND, message: `Order with id ${id} not found` });
    }

    const productsIds = order.orderItems.map((item) => item.productId);
    const validProducts = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, productsIds)
    );
    if (!validProducts) {
      throw new RpcException({ status: HttpStatus.BAD_REQUEST, message: 'Invalid product ids' });
    }
    
    if (!order) {
      throw new RpcException({ status: HttpStatus.NOT_FOUND, message: `Order with id ${id} not found` });
    }

    return {
      ...order,
      orderItems: order.orderItems.map((item) => ({
        ...item,
        name: validProducts.find((product) => product.id === item.productId).name,
      }))
    };  
  }

  async changeOrderStatus(changeOrderDto: ChangeOrderDto) {
    const { id, status } = changeOrderDto;
    const order = await this.findOne(id);
    if (order.status === status) {
      throw new RpcException({ status: HttpStatus.BAD_REQUEST, message: `Order with id ${id} is already ${status}` });
    }
    return await this.order.update({
      where: {
        id,
      },
      data: {
        status,
      }
    });
  }

  async createPaymentSession(order: OrderWithProducts) {
    const paymentSessionDto: PaymentSessionDto = {
      orderId: order.id,
      currency: 'usd',
      items: order.orderItems.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    };

    return await firstValueFrom(
      this.client.send('create.payment.session', paymentSessionDto)
    );
  }

  async paidOrder(paidOrderDto: PaidOrderDto) {
    const { orderId, stripeChargeId, receiptUrl } = paidOrderDto;
    this.logger.log(`Starting to process payment for order with id ${orderId} and stripeChargeId ${stripeChargeId}`);

    const updatedOrder = await this.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: OrderStatus.PAID,
        stripeChargeId,
        paidAt: new Date(),
        paid: true,

        orderReceipt: {
          create: {
            receiptUrl,
          }
        }
      }
    });

    this.logger.log(`Payment processed successfully for order with id ${orderId}`);
    
    return updatedOrder;
  }
}
