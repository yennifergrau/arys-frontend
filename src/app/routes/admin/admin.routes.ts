import { SubscriptionPaymentOtpPage } from './subscription-payment-otp/subscription-payment-otp.page';
import { Routes } from '@angular/router';
import { HomePage } from './home/home.page';
import { AuthPage } from './auth/auth.page';
import { DetailsPlanPage } from './details-plan/details-plan.page';
import { OcrViewPage } from './Ocr-view/ocr-view.page';
import { ScanPage } from './scan/scan.page';
import { UploadPage } from './upload/upload.page';
import { CommercePage } from './commerce/commerce.page';
import { SubscriptionPaymentPage } from './subscription-payment/subscription-payment.page';
import { EmissionPage } from './emission/emission.page';
import { DashboardPage } from './dashboard/dashboard.page';
import { AddPurchasePage } from './add-purchase/add-purchase.page';
import { MyShoppingPage } from './my-shopping/my-shopping.page';
import { CustomerPage } from './customer/customer.page';
import { AddPaymentPage } from './add-payment/add-payment.page';
import { ReportPage } from './report/report.page';
import { MembresiasPage } from './membresias/membresias.page';
import { SharedMembershipPage } from './shared-membership/shared-membership.page';
import { RecipePurchasePage } from './recipe-purchase/recipe-purchase.page';
import { CreateCustomerPage } from './create-customer/create-customer.page';
import { ServiceOrderPage } from './service-order/service-order.page';
import { MovimientosPage } from './movimientos/movimientos.page';
import { PagarDeudaPage } from './pagar-deuda/pagar-deuda.page';
import { ServiceRequestPage } from './service-request/service-request.page';
import { creditLineGuard } from './guards/credit-line.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'planes/home/user',
    component: HomePage,
  },
  {
    path: 'dashboard/sarys',
    component: DashboardPage,
  },
  {
    path: 'service-request',
    component: ServiceRequestPage,
  },
  {
    path: 'auth-veirify-sarys',
    component: AuthPage,
  },
  {
    path: 'subscription-payment',
    component: SubscriptionPaymentPage,
  },
  {
    path: 'subscription-payment-verify',
    component: SubscriptionPaymentOtpPage,
  },
  {
    path: 'commerce/sarys/data',
    component: CommercePage,
  },
  {
    path: 'details-plan-selected',
    component: DetailsPlanPage,
  },
  {
    path: 'ocr-preview/data/scan',
    component: OcrViewPage,
  },
  {
    path: 'ocr-preview/data/scan/scan',
    component: ScanPage,
  },
  {
    path: 'ocr-preview/data/scan/upload',
    component: UploadPage,
  },
  {
    path: 'emission',
    component: EmissionPage,
  },
  {
    path: 'subscription-payment',
    component: SubscriptionPaymentPage,
  },
  {
    path: 'subscription-payment-verify',
    component: SubscriptionPaymentOtpPage,
  },
  {
    path: 'commerce/sarys/data',
    component: CommercePage,
  },
  {
    path: 'financiamiento/purchase/add/payment',
    component: AddPurchasePage,
  },
  {
    path: 'my-shopping',
    component: MyShoppingPage,
  },
  {
    path: 'customer/payment/purchased',
    component: CustomerPage,
  },
  {
    path: 'purchase/recipe',
    component: RecipePurchasePage,
  },
  {
    path: 'add/payment/credit',
    component: AddPaymentPage,
  },
  {
    path: 'report/credit/payment',
    component: ReportPage,
  },
  {
    path: 'report/credit/payment/:payment_id',
    component: ReportPage,
  },
  {
    path: 'membresia/user',
    component: MembresiasPage,
  },
  {
    path: 'shared/membership/user/sarys',
    component: SharedMembershipPage,
  },
  {
    path:'movimientos',
    component: MovimientosPage,
    canActivate: [creditLineGuard],
  },
  {
    path:'pagar-deuda',
    component: PagarDeudaPage,
    canActivate: [creditLineGuard],
  },
  {
    path:'Customer/create/sarys/meritop',
    component:CreateCustomerPage
  },
  {
    path: 'service-orders/pending',
    component: ServiceOrderPage,
    canActivate: [creditLineGuard],
  },
  {
    path: '**',
    redirectTo: 'auth-veirify-sarys',
    pathMatch: 'full',
  },
];
