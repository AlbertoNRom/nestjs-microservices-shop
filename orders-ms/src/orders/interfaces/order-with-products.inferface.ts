import { Order, OrderItem } from "@prisma/client";

export interface OrderWithProducts extends Order{
    
  orderItems: {
    productId: number;
    quantity: number;
    price: number;
    name: string;
  }[]
}