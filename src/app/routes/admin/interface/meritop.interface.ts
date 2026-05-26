export interface commerce {
    ip: string,
    bank: string,
    channel : string,
    terminal: string,
    product_type: number
}

export interface customer {
    bank:string,
    channel:string,
    terminal:string,
    ip:string,
    clientid:{
        doctype:string,
        docid:number
    }
}

export interface data_commerce {
    commerce_code:string,
    commerce_description:string,
    commerce_id:number,
    nombre_emp:string,
    prefijo:string,
    rif_emp:string,
    receiving_account:{
        account:string,
        accountname:string,
        bankcode:string,
        clientid:string,
        phonenumber:string
    }
}

export interface data_customer {
    bank:string,
    basicdata:{
        email:string,
        firstname:string,
        lastname:string
    },
    channel:string,
    clientid:{
        docid:number | any,
        doctype:string | any
    },
    ip:string,
    products:{
        amount_share_to_pay:number,
        amount_share_to_pay_converted:number,
        amount_used:number,
        amount_used_converted:number,
        available:number,
        available_converted:number,
        cardnumber:string,
        company_desc:string,
        company_id:number,
        credit_due_date:string,
        credit_pay_before:string,
        currency:number,
        financing_perc:number,
        id:string,
        imageName:string,
        imageNameD:string,
        isOpen:boolean,
        limit:number,
        limit_converted:number,
        mobile_payment:boolean,
        name:string,
        open_payment:boolean,
        product_type:number,
        receiving_account:{
            bankcode:string,
            bankname:string,
            clientid:string,
            phonenumber:string
        },
        symbol:string
    },
    serial:string,
    terminal:string
}

export interface listBank {
    ip:string,
    bank:string,
    channel:string,
    terminal:string,
    op:string
}

export interface transactionC {
    ip:string,
    bankid:number,
    clientid:{
        doctype:string,
        docid:number
    },
    cardnumber:string
}

export interface addPurchased {
    ip:string,
    channel:string,
    client:{
        doctype:string,
        docid:number | any
    },
    cardnumber:string,
    reference:string,
    amount:number,
    concept:string,
    payment:{
        bankcode:string,
        doctype:string,
        docid:number,
        account:string,
        phonenumber:string,
        paidon: string | Date
    }
}

export interface addPayment {
    ip: string,
    channel: string,
    client: {
        doctype: string,
        docid: number | string
    },
    cardnumber: string,
    amount:number,
    payphone: string,
    paidon: string,
    bankcode: string,
    concept: string
}

export interface userCreateCustomer {
    clientid: {
        doctype: string,
        docid:number
    },
    name: string,
    last_name: string,
    email:string,
    phone_number:string,
    account_number:string,
    product_code:number
}

export interface Transaction {
    transactionId: string;
    amount: number;
    description: string;
    merchantName?: string;
    reference?: string;
    date: string;
    type: 'purchase' | 'payment' | 'commission' | string;
    status?: string;
    paymentType?: string;
    paymentStatus?: string;
    symbol?: string;
    cardNumber?: string;
    amountConverted?: number;
    exchangeRate?: number;
}

export interface TransactionListRequest {
    ip: string;
    bank: string;
    channel: string;
    terminal: string;
    productId: string;
}

