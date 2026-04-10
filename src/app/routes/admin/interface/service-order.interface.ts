export interface PaymentMobileData {
  method?: string;
  status?: string;
  bank?: string;
  phone?: string;
  document?: string;
  account_holder?: string;
}

export interface ProviderPaymentMobile {
  bank_code: string;
  id_number: string;
  mobile_number: string;
}

export interface ServiceOrder {
  id_order: number;
  order_id: string;
  order_number: string;
  provider_id: number;
  provider_name: string;
  service_id: number;
  service_name: string;
  amount: number;
  customer_id: number;
  payment_mobile_data: PaymentMobileData;
  provider_payment_mobile?: ProviderPaymentMobile;
  status: 'pending' | 'credit_applied' | 'payment_pending' | 'completed' | 'cancelled' | 'approved' | 'rejected';
  credit_used?: number;
  remaining_payment?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreditInfo {
  id_master: number;
  membership_type: string;
  credit_line_id: string;
  limit: number;
  used: number;
  available: number;
}

export interface OrderDetailsResponse {
  status: boolean;
  message: string;
  code: number;
  order: ServiceOrder;
  credit: CreditInfo | null;
}

export interface ApplyCreditResponse {
  status: boolean;
  message: string;
  credit_used?: number;
  remaining_payment?: number;
  new_credit_balance?: number;
  meritop_transaction_id?: string;
  order_status?: string;
  provider_payment_mobile?: PaymentMobileData;
}

export interface PendingOrdersResponse {
  status: boolean;
  message: string;
  code: number;
  data: ServiceOrder[];
}

export interface PaymentResponse {
  status: boolean;
  message: string;
  transaction_id?: string;
  new_balance?: number;
}

export interface CustomerProductSummary {
  id: string;
  cardnumber: string;
  limit: number;
  available: number;
  amount_used: number;
  amount_share_to_pay: number;
  credit_pay_before: string;
}
