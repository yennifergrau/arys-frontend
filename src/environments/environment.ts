export const environment = {
  production: false,

  // Debe coincidir con versiones.id_version al compilar cada APK
  appVersionCode: 4,

  /** Atención por WhatsApp (solo dígitos, con código de país; ej. 584121234567) */
  contact: {
    whatsappPhone: '584144128237',
    whatsappServiceMessage: 'Hola, buen día. Quisiera solicitar un servicio; ¿me pueden indicar cómo hacerlo o qué información necesitan?',
  },

  downloadMobileAppLink: 'https://docs.polizaqui.com/arys.apk',
  url_app_ventas: 'https://arys.polizaqui.com',
  authentication: 'https://sarys-auth.polizaqui.com',
  ocrImageService: 'https://ocr-documento-qa.polizaqui.com',
  ocrFileService: 'https://adjuntar-documento-qa.polizaqui.com',
  paymentSypago: 'https://pagos-qa.arys.polizaqui.com',
  /** Backend Polizaqui (Arys-Poliza): register/payment + register/membership */
  polizaqui: {
    baseUrl: 'https://arys-ui-service.polizaqui.com',
    tasa: 'tasa',
    registerPayment: 'register/payment',
    registerMembership: 'register/membership',
  },

  sarys: {
    url: 'https://sarys-services.polizaqui.com',
    usuario: {
      estatus: 'sarys/post/fechetd/status',
    },
    propietario: {
      estados: 'sarys/get/fechetd/province',
      ciudades: 'sarys/get/fechetd/city',
      genero: 'sarys/get/fechetd/genero',
      estadoCivil: 'sarys/get/fechetd/est_civil',
    },
    vehiculo: {
      marcas: 'sarys/get/fechetd/marcas/vehiculo',
      modelos: 'sarys/get/fechetd/modelos',
      versiones: 'sarys/get/fechetd/version',
      anno: 'sarys/get/fechetd/anoV',
      colores: 'sarys/get/fechetd/color',
    },
    otherAPIs: {
      addProperty: 'Sarys/post/fechetd/add/property',
      dataProperty: 'sarys/get/fechetd/person/property',
      add_vehicle: 'Sarys/post/fechetd/vehicle/add',
      dataVehicle: 'sarys/get/fechetd/vehicle/data',
      documentProcess : 'sarys/get/fechetd/document/process',
      cobertCotizador : 'sarys/get/fechetd/cobert/cotizador',
      sendDocument : 'sarys/post/fechetd/send/document',
      registerSubscriptions : 'sarys/post/fechetd/register/subscription',
      addContractPerson : 'sarys/post/fechetd/add/contract/person'
    },
  },

  arys:{
    url:'https://sarys-services.polizaqui.com',
    OtherApis:{
      add_person: 'data/fecht/user/property',
      add_vehicle:'data/fecht/vehicle/user',
      add_payment: 'data/fecht/payment/user',
      add_membership: 'data/fecht/membership/user',
      get_membership: 'data/get/fecht/membership/member',
      get_membership_by_email: 'data/get/fecht/membership/by-email',
      get_membership_by_cedrif: 'data/get/fecht/membership/by-cedrif',
      retry_credit_line: 'data/post/fecht/retry/credit-line',
      validate_credit_line: 'data/post/fecht/validate/credit-line',
      update_membership_cedrif_credit: 'data/post/fecht/membership',
      update_membership_cedrif_membership: 'data/post/fecht/membership',
      save_credit_payment: 'data/post/fecht/credit/payment',
      get_credit_payment_by_id: 'data/get/fecht/credit/payment',
      update_credit: 'update/credit/data',
      get_pending_orders: 'api/service-orders/pending',
      get_order_details: 'api/service-order',
      pay_order_credit: 'api/service-order',
      apply_credit: 'api/service-order'
    }
  },

  meritop:{
    url:'https://sarys-services.polizaqui.com',
    access:{
      tokenAccess:'sarys/get/meritop/token/access',
    },
    globalMeritop:{
      customer:'sarys/post/meritop/customer/products',
      commerce:'sarys/post/meritop/commerce/directory',
      addPurchased:'sarys/post/meritop/add/purchased',
      addPayment:'sarys/post/meritop/add/payment',
      transactionC:'sarys/post/meritop/transaction/customer',
      transactionList:'sarys/post/meritop/transaction/customer/list',
      transactionListByMonth:'sarys/post/meritop/transaction/customer/listByMonth',
      detailTransaction:'sarys/post/meritop/transaction/details',
      createcustomeruser:'sarys/post/meritop/customer/create/user',
      listProvider: 'sarys/get/fechetd/list/provider'
    },
    listBank:{
      meritoBank:'sarys/post/meritop/list/bank/directory'
    },
    addData:{
      add_purchase:'data/post/fecht/purchased/user',
      get_purchase: 'data/get/fecht/all/purchased'  
    }
  },

  user:{
    url:'https://sarys-auth.polizaqui.com',
    data:{
      view_user: 'view/user/fechetd/user',
      edit_user: 'edit/post/user/view'
    }
  },
};
