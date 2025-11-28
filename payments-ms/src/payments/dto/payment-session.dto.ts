import { IsString } from 'class-validator';
import { IsNumber, IsPositive } from 'class-validator';
import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';




export class PaymentSessionDto {

    @IsString()
    orderId: string;
  
    @IsString()
    currency: string;
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => PaymentSessionItemDto)
    items: PaymentSessionItemDto[];
}


export class PaymentSessionItemDto {

    @IsString()
    name: string;

    @IsNumber()
    @IsPositive()
    price: number;

    @IsNumber()
    @IsPositive()
    quantity: number;
}