import { IsUrl, IsString, IsUUID } from "class-validator";


export class PaidOrderDto {

    @IsString()
    stripeChargeId: string;

    @IsString()
    @IsUUID()
    orderId: string;

    @IsString()
    @IsUrl()
    receiptUrl: string;
}