declare module "razorpay" {
  interface RazorpayOptions {
    key_id: string;
    key_secret: string;
  }

  interface OrderOptions {
    amount: number;
    currency: string;
    receipt?: string;
    notes?: {
      [key: string]: any;
    };
  }

  interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
    created_at: number;
  }

  export default class Razorpay {
    constructor(options: RazorpayOptions);
    orders: {
      create(options: OrderOptions): Promise<RazorpayOrder>;
    };
  }
}
