import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  OnChanges,
  OnInit,
  SimpleChanges,
  Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { Router, RouterLink } from '@angular/router';
import {
  commerce,
  customer,
  data_commerce,
  data_customer,
} from '../interface/meritop.interface';
import { MeritopService } from '../services/meritop.service';
import { HttpClientModule } from '@angular/common/http';
import { JsonLoaderService } from '../services/json-loader.service';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { FormatCurrencyPipe } from '../pipes/currency.pipe';
import { jwtDecode } from 'jwt-decode'
import { EmissionService } from '../services/emission.service';
import { NavController, ViewWillEnter } from '@ionic/angular';
import { EmissionDetailsService } from '../services/emission-details.service';
import { DataArysService } from '../services/data-arys.service';
import { ServiceOrderService } from '../services/service-order.service';
import { MeritopSummaryCacheService } from '../services/meritop-summary-cache.service';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

type ServiceOption = {
  id: string;
  label: string;
  description?: string;
  /** Lista corta de coberturas/ejemplos (se muestra en la ventanita). */
  details?: string[];
  icon: string;
  selected: boolean;
};

type QuickChip = { label: string; value: string };

type MeritopSummary = {
  available: number;
  limit: number;
  amount_used: number;
  cardnumber: string;
  credit_pay_before?: string;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabComponent,
    HttpClientModule,
    SpinnerComponent,
    FormatCurrencyPipe,
  ],
  providers: [MeritopService, JsonLoaderService, EmissionService, DataArysService, ServiceOrderService],
})
export class DashboardPage implements OnInit, ViewWillEnter {

  private arys_service = inject(DataArysService)
  private meritopCache = inject(MeritopSummaryCacheService)
  public isHidden: boolean = true;
  public json_customer: customer[] | any;
  private emission = inject(EmissionService);
  public commerce_data: any;
  public customer_data: data_customer[] = [];
  public showLoading: boolean = false;

  public firstName!: string | any;
  public amountTotal!: string | number;
  public membershipName!: string | any;
  public username !: string
  public data_membership: any[] | null = null;
  public hasPendingOrder: boolean = false;
  public pendingOrdersCount: number = 0;

  // Control de carga: la UX debe esperar a que todo esté listo
  private loadState = {
    membership: false,
    meritop: false,
    pendingOrders: false,
  };

  // WhatsApp (armador rápido en Inicio)
  public waExpanded: boolean = false;
  public waLocation: string = '';
  public waPlate: string = '';
  public waReference: string = '';
  public waNotes: string = '';
  public waShowPreview: boolean = false;
  public waShowExtra: boolean = false;
  /** Opción elegida dentro del servicio (ej: Grúa → 1 ocupante). */
  public waDetailSelected: string | null = null;

  // WhatsApp (solicitud a proveedores / repuestos)
  public buyExpanded: boolean = false;
  public buyItem: string = '';
  public buyLocation: string = '';
  public buyPlate: string = '';
  public buyNotes: string = '';
  public buyShowPreview: boolean = false;
  public buyShowExtra: boolean = false;

  public buyCategories: Array<{ id: string; label: string; icon: string; selected: boolean }> = [
    { id: 'repuesto', label: 'Repuesto', icon: 'fa-gears', selected: false },
    { id: 'bateria', label: 'Batería', icon: 'fa-car-battery', selected: false },
    { id: 'caucho', label: 'Caucho', icon: 'fa-circle-dot', selected: false },
    { id: 'aceite', label: 'Aceite', icon: 'fa-oil-can', selected: false },
    { id: 'frenos', label: 'Frenos', icon: 'fa-car', selected: false },
    { id: 'otro', label: 'Otro', icon: 'fa-cart-shopping', selected: false },
  ];

  private defaultPlate: string = '';

  public waOptions: ServiceOption[] = [
    {
      id: 'grua',
      label: 'Grúa',
      details: ['1 ocupante', '2 o más ocupantes'],
      icon: 'fa-truck-pickup',
      selected: false,
    },
    {
      id: 'bateria',
      label: 'Asistencia Vial',
      details: ['Cambio de caucho', 'Repuestos', 'Paso de corriente (batería)', 'Asesoría mecánica'],
      icon: 'fa-car-battery',
      selected: false,
    },
    {
      id: 'cachos',
      label: 'Asesoría Legal Telf.',
      details: ['Imposición de multa', 'Accidentes de tránsito'],
      icon: 'fa-circle-dot',
      selected: false,
    },
    {
      id: 'repuesto',
      label: 'Parabrisas',
      details: ['Sustitución de vidrio'],
      icon: 'fa-gears',
      selected: false,
    },
  ];

  // Resumen Meritop para mostrar montos reales en Inicio
  private meritopSummaryState: 'idle' | 'loading' | 'ready' | 'fallback' = 'idle';
  private meritopProduct: MeritopSummary | null = null;
  public get meritopReady(): boolean {
    return this.meritopSummaryState === 'ready' && !!this.meritopProduct && this.meritopProduct.limit > 0;
  }

  public get meritopLoading(): boolean {
    return this.meritopSummaryState === 'loading' || this.meritopSummaryState === 'idle';
  }

  public creditUsagePercent(m: { credit_limit: number; credit_used: number } | any): number {
    if (!this.meritopReady) return 0;
    const limit = Number(m?.credit_limit) || 0;
    const used = Number(m?.credit_used) || 0;
    if (limit <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const normalized = trimmed.includes(',')
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Filas listas para la vista (API `get_membership` → credit_limit / credit_available). */
  get membershipList(): Array<{
    id_master: number;
    name: string;
    plan_label?: string;
    available_amount: number;
    credit_limit: number;
    credit_used: number;
    has_credit: boolean;
    credit_pay_before?: string;
  }> {
    const d = this.data_membership;
    if (!d || !Array.isArray(d)) return [];
    const contractProductId = this.getContractProductId();
    return d.map((row: any) => {
      let limit = this.toNumber(row.credit_limit);
      let available = this.toNumber(row.credit_available);
      let creditUsed = this.toNumber(row.credit_used);
      let creditPayBefore: string | undefined = row?.credit_pay_before != null ? String(row.credit_pay_before) : undefined;

      // Si Meritop respondió bien, preferimos esos montos (evita mostrar 300 “fijo” de ARYS).
      if (
        this.meritopSummaryState === 'ready' &&
        this.meritopProduct &&
        this.meritopProduct.limit > 0
      ) {
        limit = this.meritopProduct.limit;
        available = this.meritopProduct.available;
        creditUsed = this.meritopProduct.amount_used;
        if (this.meritopProduct.credit_pay_before) {
          creditPayBefore = this.meritopProduct.credit_pay_before;
        }
      }

      const certificate = String(row.certificate ?? row.certificado ?? '').trim();
      // Requisito UX: en el dashboard mostramos únicamente el certificado.
      const label = certificate || 'Certificado';
      const lineId = row.credit_line_id != null && String(row.credit_line_id).trim() !== '';

      // Si el certificado viene en formato "<id_producto>-...", usamos el prefijo para mapear el plan.
      const productIdFromCertificate = (() => {
        const m = certificate.match(/^(\d+)\s*-/);
        if (!m) return null;
        const n = Number(m[1]);
        return Number.isFinite(n) ? n : null;
      })();
      const productId =
        contractProductId ??
        productIdFromCertificate ??
        (row.id_producto != null ? Number(row.id_producto) : null) ??
        (row.product_id != null ? Number(row.product_id) : null) ??
        (row.id_product != null ? Number(row.id_product) : null) ??
        null;
      const planFromApi =
        row?.plan != null && String(row.plan).trim() !== '' ? String(row.plan).trim() : undefined;
      const plan_label = planFromApi ?? this.resolvePlanLabel(productId);

      return {
        id_master: row.id_master,
        name: label,
        plan_label,
        available_amount: available,
        credit_limit: limit,
        credit_used: creditUsed,
        has_credit: !!lineId,
        credit_pay_before: creditPayBefore,
      };
    });
  }

  private getContractProductId(): number | null {
    // Preferimos el contrato guardado en `userData` (localStorage) porque suele ser la fuente correcta.
    // Fallback: sessionStorage.numberContract si existe.
    const asNumber = (v: any): number | null => {
      const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    try {
      const raw = localStorage.getItem('userData');
      const ud = raw ? JSON.parse(raw) : null;
      const contract =
        ud?.contract ??
        ud?.contrato ??
        ud?.numberContract ??
        ud?.numeroContrato ??
        ud?.id_producto ??
        ud?.product_id ??
        ud?.id_product;
      const n = asNumber(contract);
      if (n) return n;
    } catch {
      // noop
    }

    try {
      const n = asNumber(sessionStorage.getItem('numberContract'));
      if (n) return n;
    } catch {
      // noop
    }

    return null;
  }

  private resolvePlanLabel(productId: number | null): string | undefined {
    if (!productId || Number.isNaN(productId)) return undefined;
    const map: Record<number, string> = {
      1: 'ARYSCLUB Moto Básico',
      2: 'ARYSCLUB Vehículo Básico',
      3: 'CLUB-ARYS GRUERO',
      4: 'PLAN BÁSICO GRÚA',
      5: 'PLAN GOLD',
      6: 'PLAN DIAMANTE',
    };
    return map[productId] ?? `Plan ${productId}`;
  }

  public get waSelectedCount(): number {
    return this.waOptions.reduce((acc, o) => acc + (o.selected ? 1 : 0), 0);
  }

  public get waSelected(): ServiceOption | null {
    return this.waOptions.find(o => o.selected) ?? null;
  }

  public get waLocationChips(): QuickChip[] {
    return [
      { label: 'Autopista', value: 'Autopista' },
      { label: 'En casa', value: 'En casa' },
      { label: 'Trabajo', value: 'Trabajo' },
      { label: 'Centro comercial', value: 'Centro comercial' },
      { label: 'Estacionamiento', value: 'Estacionamiento' },
    ];
  }

  public get waNoteChips(): QuickChip[] {
    const id = this.waSelected?.id ?? '';
    const common: QuickChip[] = [
      { label: 'Estoy seguro', value: 'Estoy en un lugar seguro' },
      { label: 'Estoy en vía', value: 'Estoy en vía' },
      { label: 'Urgente', value: 'Necesito ayuda lo antes posible' },
    ];
    const byService: Record<string, QuickChip[]> = {
      grua: [
        { label: 'No enciende', value: 'El vehículo no enciende' },
        { label: 'Accidente', value: 'Tuve un incidente/accidente' },
        { label: 'Traslado', value: 'Necesito traslado del vehículo' },
      ],
      bateria: [
        { label: 'No enciende', value: 'No enciende' },
        { label: 'Arranque lento', value: 'El arranque está lento' },
        { label: 'Luces débiles', value: 'Las luces están débiles' },
      ],
      cachos: [
        { label: 'Pinchazo', value: 'Tengo un pinchazo' },
        { label: 'Sin repuesto', value: 'No tengo cacho de repuesto' },
        { label: 'Rueda trancada', value: 'La rueda está trancada' },
      ],
      repuesto: [
        { label: 'Cotización', value: 'Necesito cotización y disponibilidad' },
        { label: 'Pieza específica', value: 'Busco una pieza específica (detallo en notas)' },
        { label: 'Entrega', value: 'Necesito coordinar entrega o retiro' },
      ],
    };
    return [...(byService[id] ?? []), ...common];
  }

  public addWaLocationPreset(text: string): void {
    const t = String(text || '').trim();
    if (!t) return;
    if (!this.waLocation.trim()) {
      this.waLocation = t;
      return;
    }
    if (this.waLocation.toLowerCase().includes(t.toLowerCase())) return;
    this.waLocation = `${this.waLocation.trim()} · ${t}`;
  }

  public addWaNotePreset(text: string): void {
    const t = String(text || '').trim();
    if (!t) return;
    if (!this.waNotes.trim()) {
      this.waNotes = t;
      return;
    }
    if (this.waNotes.toLowerCase().includes(t.toLowerCase())) return;
    this.waNotes = `${this.waNotes.trim()}\n- ${t}`;
  }

  public useMyLocation(): void {
    if (!('geolocation' in navigator)) {
      this.mostrarToast('Tu navegador no soporta ubicación.', 'toast-error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const maps = `https://maps.google.com/?q=${lat},${lng}`;
        this.waLocation = `Ubicación GPS: ${maps}`;
        this.mostrarToast('Ubicación agregada.', 'toast-success');
      },
      () => {
        this.mostrarToast('No se pudo obtener tu ubicación. Activa permisos GPS.', 'toast-error');
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  }

  // -------- Proveedores / repuestos (WhatsApp) --------
  public get buySelectedCategory(): string {
    return this.buyCategories.find(c => c.selected)?.label ?? '';
  }

  public selectBuyCategory(cat: { id: string; label: string; icon: string; selected: boolean }): void {
    const willSelect = !cat.selected;
    this.buyCategories.forEach(c => (c.selected = false));
    cat.selected = willSelect;
    if (!this.buyExpanded) this.buyExpanded = true;
    setTimeout(() => this.scrollTo('buy-details'), 50);
  }

  public get buyCanSend(): boolean {
    return (
      this.buyCategories.some(c => c.selected) ||
      this.buyItem.trim().length > 0 ||
      this.buyLocation.trim().length > 0 ||
      this.buyPlate.trim().length > 0 ||
      this.buyNotes.trim().length > 0
    );
  }

  public clearBuy(): void {
    this.buyCategories.forEach(c => (c.selected = false));
    this.buyItem = '';
    this.buyLocation = '';
    this.buyPlate = this.defaultPlate;
    this.buyNotes = '';
    this.buyShowPreview = false;
    this.buyShowExtra = false;
  }

  public closeBuy(): void {
    this.buyExpanded = false;
    this.buyShowPreview = false;
    this.buyShowExtra = false;
    setTimeout(() => this.scrollTo('buy-top'), 50);
  }

  public toggleBuyPreview(): void {
    this.buyShowPreview = !this.buyShowPreview;
    if (this.buyShowPreview) {
      setTimeout(() => this.scrollTo('buy-preview'), 50);
    }
  }

  public toggleBuyExtra(): void {
    this.buyShowExtra = !this.buyShowExtra;
    if (this.buyShowExtra) {
      setTimeout(() => this.scrollTo('buy-extra'), 50);
    }
  }

  public addBuyLocationPreset(text: string): void {
    const t = String(text || '').trim();
    if (!t) return;
    if (!this.buyLocation.trim()) {
      this.buyLocation = t;
      return;
    }
    if (this.buyLocation.toLowerCase().includes(t.toLowerCase())) return;
    this.buyLocation = `${this.buyLocation.trim()} · ${t}`;
  }

  public addBuyNotePreset(text: string): void {
    const t = String(text || '').trim();
    if (!t) return;
    if (!this.buyNotes.trim()) {
      this.buyNotes = t;
      return;
    }
    if (this.buyNotes.toLowerCase().includes(t.toLowerCase())) return;
    this.buyNotes = `${this.buyNotes.trim()}\n- ${t}`;
  }

  public useMyLocationForBuy(): void {
    if (!('geolocation' in navigator)) {
      this.mostrarToast('Tu navegador no soporta ubicación.', 'toast-error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const maps = `https://maps.google.com/?q=${lat},${lng}`;
        this.buyLocation = `Ubicación GPS: ${maps}`;
        this.mostrarToast('Ubicación agregada.', 'toast-success');
      },
      () => {
        this.mostrarToast('No se pudo obtener tu ubicación. Activa permisos GPS.', 'toast-error');
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  }

  public buildBuyMessage(): string {
    const membership = this.membershipList?.[0];
    const cert =
      this.data_membership?.[0]?.certificate != null
        ? String(this.data_membership[0].certificate).trim()
        : this.data_membership?.[0]?.certificado != null
          ? String(this.data_membership[0].certificado).trim()
          : '';
    const plan = membership?.plan_label ?? '';
    const cat = this.buySelectedCategory;

    const lines = [
      'Hola, buen día. Quisiera solicitar una compra con proveedor (repuesto).',
      '',
      this.username ? `Cliente: ${this.username}` : '',
      cert ? `Certificado: ${cert}` : '',
      plan ? `Plan: ${plan}` : '',
      '',
      cat ? `Categoría: ${cat}` : '',
      this.buyItem.trim() ? `Pieza/Repuesto: ${this.buyItem.trim()}` : '',
      this.buyPlate.trim() ? `Placa: ${this.buyPlate.trim().toUpperCase()}` : '',
      this.buyLocation.trim() ? `Ubicación: ${this.buyLocation.trim()}` : '',
      this.buyNotes.trim() ? `\nNotas:\n${this.buyNotes.trim()}` : '',
    ].filter(Boolean);

    return lines.join('\n');
  }

  public sendBuyWhatsapp(): void {
    const msg = this.buildBuyMessage();
    const url = this.buildWhatsappUrl(msg);
    if (!url) {
      this.mostrarToast('No se pudo abrir WhatsApp: número inválido.', 'toast-error');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  public get waCanSend(): boolean {
    const details = this.waSelected?.details ?? [];
    const needsDetail = (this.waSelectedCount > 0) && details.length > 0;
    const hasDetail = !needsDetail || (this.waDetailSelected != null && this.waDetailSelected.trim().length > 0);
    // Si el usuario eligió un servicio que requiere opción, no permitimos enviar
    // aunque tenga ubicación/notas, hasta que seleccione la opción.
    if (needsDetail && !hasDetail) return false;
    return (
      (this.waSelectedCount > 0 && hasDetail) ||
      this.waLocation.trim().length > 0 ||
      this.waPlate.trim().length > 0 ||
      this.waReference.trim().length > 0 ||
      this.waNotes.trim().length > 0
    );
  }

  public toggleWaExpanded(): void {
    this.waExpanded = !this.waExpanded;
    if (this.waExpanded) {
      setTimeout(() => this.scrollTo('wa-compose'), 50);
    }
  }

  public closeWa(): void {
    this.waExpanded = false;
    this.waShowPreview = false;
    this.waShowExtra = false;
    this.waDetailSelected = null;
    // Cerrar con la X debe colapsar todo (incluida la “opción”).
    this.waOptions.forEach(o => (o.selected = false));
    setTimeout(() => this.scrollTo('wa-top'), 50);
  }

  public selectWaOption(opt: ServiceOption): void {
    // Si se toca el mismo servicio ya seleccionado, se deselecciona y se cierra el formulario.
    if (opt.selected) {
      this.waOptions.forEach(o => (o.selected = false));
      this.closeWa();
      return;
    }

    const before = this.waSelectedCount;
    this.waOptions.forEach(o => (o.selected = false));
    opt.selected = true;
    const after = this.waSelectedCount;

    const details = opt.details ?? [];
    this.waDetailSelected = details.length === 1 ? details[0] : null;
    if (!this.waExpanded) this.waExpanded = true;
    if (before === 0 && after > 0) {
      setTimeout(() => this.scrollTo('wa-details'), 50);
    }
  }

  public selectWaDetail(detail: string): void {
    const d = (detail ?? '').trim();
    if (!d) return;
    // Toggle: si toca la misma opción, se desmarca.
    this.waDetailSelected = this.waDetailSelected === d ? null : d;
  }

  public clearWa(): void {
    this.waOptions.forEach(o => (o.selected = false));
    this.waLocation = '';
    this.waPlate = this.defaultPlate;
    this.waReference = '';
    this.waNotes = '';
    this.waShowPreview = false;
    this.waShowExtra = false;
    this.waDetailSelected = null;
    setTimeout(() => this.scrollTo('wa-top'), 50);
  }

  public toggleWaExtra(): void {
    this.waShowExtra = !this.waShowExtra;
    if (this.waShowExtra) {
      setTimeout(() => this.scrollTo('wa-extra'), 50);
    }
  }

  public toggleWaPreview(): void {
    this.waShowPreview = !this.waShowPreview;
    if (this.waShowPreview) {
      setTimeout(() => this.scrollTo('wa-preview'), 50);
    }
  }


  private buildWhatsappUrl(text: string): string | null {
    const raw = environment.contact?.whatsappPhone ?? '';
    const phone = raw.replace(/\D/g, '');
    if (phone.length < 10) return null;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  public buildWaMessage(): string {
    const chosen = this.waSelected?.label ?? '';
    const detail = (this.waDetailSelected ?? '').trim();
    const membership = this.membershipList?.[0];
    const cert =
      this.data_membership?.[0]?.certificate != null
        ? String(this.data_membership[0].certificate).trim()
        : this.data_membership?.[0]?.certificado != null
          ? String(this.data_membership[0].certificado).trim()
          : '';
    const plan = membership?.plan_label ?? '';

    const lines = [
      'Hola, buen día. Quiero solicitar un servicio.',
      '',
      this.username ? `Cliente: ${this.username}` : '',
      cert ? `Membresia: ${cert}` : '',
      plan ? `Plan: ${plan}` : '',
      this.waPlate.trim() ? `Placa: ${this.waPlate.trim().toUpperCase()}` : '',
      this.waLocation.trim() ? `Ubicación: ${this.waLocation.trim()}` : '',
      this.waReference.trim() ? `Referencia: ${this.waReference.trim()}` : '',
      '',
      chosen ? `Servicio: ${chosen}` : '',
      detail ? `Opción: ${detail}` : '',
      this.waNotes.trim() ? `\nNotas:\n${this.waNotes.trim()}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  }

  public sendWhatsappFromDashboard(): void {
    const details = this.waSelected?.details ?? [];
    if (this.waSelectedCount > 0 && details.length > 0 && (!this.waDetailSelected || this.waDetailSelected.trim().length === 0)) {
      this.mostrarToast('Selecciona una opción del servicio (ej: 1 ocupante).', 'toast-warning');
      return;
    }
    const msg = this.buildWaMessage();
    const url = this.buildWhatsappUrl(msg);
    if (!url) {
      this.mostrarToast('No se pudo abrir WhatsApp: número inválido.', 'toast-error');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  public scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  public formatCreditPayBefore(value?: string): string {
    const raw = (value ?? '').toString().trim();
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  private getIdentity(): { doctype: string; docid: number } | null {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (token) {
        const decoded: any = jwtDecode(token);
        const tokenDocType = String(decoded?.doctype || decoded?.prefix || '').trim();
        const tokenDocId = Number(decoded?.docid || decoded?.rif || 0);
        if (tokenDocType && tokenDocId > 0) return { doctype: tokenDocType, docid: tokenDocId };
      }
    } catch {
      // noop
    }

    try {
      const raw = localStorage.getItem('userData');
      const userData = raw ? JSON.parse(raw) : null;
      const docType = String(userData?.doctype || userData?.prefix || userData?.letra_rif || '').trim();
      const docId = Number(userData?.docid || userData?.rif || 0);
      if (docType && docId > 0) return { doctype: docType, docid: docId };
    } catch {
      // noop
    }

    return null;
  }

  private finishIfReady(): void {
    const ready = this.loadState.membership && this.loadState.meritop && this.loadState.pendingOrders;
    if (ready) {
      this.showLoading = false;
    }
  }

  private applyMeritopProduct(product: any): void {
    const limit = this.toNumber(product.limit ?? 0);
    const available = this.toNumber(product.available ?? 0);
    const amount_used = this.toNumber(product.amount_used ?? product.present_debt_amt ?? 0);
    this.meritopProduct = {
      limit,
      available,
      amount_used,
      cardnumber: String(product.cardnumber ?? ''),
      credit_pay_before: product.credit_pay_before != null ? String(product.credit_pay_before) : undefined,
    };
    this.meritopSummaryState = 'ready';
    this.meritopCache.persistFromProduct(product);
  }

  private hydrateMeritopFromCache(): boolean {
    try {
      const cached = this.meritopCache.read();
      if (!cached) return false;
      const limit = this.toNumber(cached?.limit ?? 0);
      const available = this.toNumber(cached?.available ?? 0);
      if (limit <= 0) return false;
      this.meritopProduct = {
        limit,
        available,
        amount_used: this.toNumber(cached?.amount_used ?? 0),
        cardnumber: String(cached?.cardnumber ?? ''),
        credit_pay_before: cached?.credit_pay_before != null ? String(cached.credit_pay_before) : undefined,
      };
      this.meritopSummaryState = 'ready';
      return true;
    } catch {
      return false;
    }
  }

  private fetchMeritopProduct(silentRefresh = false): void {
    const identity = this.getIdentity();
    if (!identity) {
      if (!silentRefresh) {
        this.meritopSummaryState = 'fallback';
        this.meritopProduct = null;
      }
      this.loadState.meritop = true;
      this.finishIfReady();
      return;
    }

    if (!silentRefresh) {
      this.meritopSummaryState = 'loading';
    }

    this.meritopCache.refreshFromServer$(identity).subscribe({
      next: (product) => {
        if (product) {
          this.applyMeritopProduct(product);
        } else if (!silentRefresh) {
          this.meritopSummaryState = 'fallback';
          this.meritopProduct = null;
        }
        this.loadState.meritop = true;
        this.finishIfReady();
        this.changeDetector.markForCheck();
      },
      error: () => {
        if (!silentRefresh) {
          this.meritopSummaryState = 'fallback';
          this.meritopProduct = null;
        }
        this.loadState.meritop = true;
        this.finishIfReady();
      },
    });
  }

  private loadMeritopSummary() {
    const hadCache = this.hydrateMeritopFromCache();
    if (hadCache) {
      this.loadState.meritop = true;
      this.finishIfReady();
    }
    this.fetchMeritopProduct(hadCache);
  }

  ionViewWillEnter() {
    if (this.loadState.membership) {
      this.fetchMeritopProduct(true);
      void this.checkPendingOrders();
    }
  }

  constructor(
    private changeDetector: ChangeDetectorRef,
    private meritopService: MeritopService,
    private _emisionService: EmissionDetailsService,
    private router : Router,
    private renderer: Renderer2,
    private navCtrl: NavController,
    private serviceOrders: ServiceOrderService
  ) {
    // try {
    //   this.showLoading = false;
    //   this.meritopService.getAccessToken().subscribe({
    //     next: async (result) => {
    //       if (result.status === 200) {
    //         const data = {
    //           ip:"10.1.1.1",
    //           bank:"94932663-923d-48a3-b13a-6b0bea8f3608",
    //           channel:"eea602fb-749e-460a-9805-9f993fc0036a",
    //           terminal:"0",
    //           product_type:3
    //         }
    //         this.meritopService.listCommerce(data).subscribe({
    //           next: async (result:any) => {
    //             this.commerce_data = result.commerces;
    //             console.log(this.commerce_data);
                
    //             await this.loadCustomer();
    //           },
    //           error: (error) => {
    //             console.error('Error al obtener los comercios' + error);
    //           },
    //         });
    //         this.changeDetector.detectChanges();
    //       }
    //     },
    //     error: (error) => {
    //       this.showLoading = false;
    //       console.error('Error al generar el token', error);
    //     },
    //   });
    // } catch (e) {
    //   this.showLoading = false;
    //   console.error(e);
    // }
  }

    public routingPage(value :any) : void {
    this._emisionService.commerceData = value
    this.router.navigate(['/admin/financiamiento/purchase/add/payment'])
  }

  toggleVisibility(event: Event) {
    event.stopPropagation();
    this.isHidden = !this.isHidden;
  }

  public solicitarServicio() {
    this.router.navigate(['/admin/service-request']);
  }

  public solicitarServicioRapido(serviceId: string) {
    this.router.navigate(['/admin/service-request'], {
      queryParams: { service: serviceId }
    });
  }

  public verMovimientos() {
    this.router.navigate(['/admin/movimientos']);
  }

  public verOrdenesServicio() {
    this.router.navigate(['/admin/service-orders/pending']);
  }

  /** No redirige: solo carga estado para mostrar CTA en el dashboard. */
  private async checkPendingOrders(): Promise<void> {
    const stored = sessionStorage.getItem('id_member');
    const membershipId = stored ? Number(stored) : NaN;
    if (Number.isNaN(membershipId) || membershipId <= 0) {
      this.loadState.pendingOrders = true;
      this.finishIfReady();
      return;
    }

    try {
      const res: any = await firstValueFrom(this.serviceOrders.getPendingOrders(membershipId));
      const list = res?.status && Array.isArray(res.data) ? res.data : [];
      this.pendingOrdersCount = list.length;
      this.hasPendingOrder = this.pendingOrdersCount > 0;
      // Persistimos lista para que esté “precargada” al navegar.
      this.meritopCache.persistPendingOrders(list);
      this.loadState.pendingOrders = true;
      this.finishIfReady();
    } catch {
      // Si falla, no bloqueamos el inicio.
      this.hasPendingOrder = false;
      this.pendingOrdersCount = 0;
      this.loadState.pendingOrders = true;
      this.finishIfReady();
    }
  }

  get hasAnyCreditLine(): boolean {
    return this.membershipList.some(m => m.has_credit);
  }

  get hasAnyDebt(): boolean {
    return this.membershipList.some(m => m.has_credit && Number(m.credit_used) > 0);
  }

  public pagarDeudaRapido(): void {
    const debtMembership = this.membershipList.find(
      m => m.has_credit && Number(m.credit_used) > 0
    );
    if (!debtMembership) {
      this.mostrarToast('No tienes deuda pendiente para abonar.', 'toast-error');
      return;
    }
    this.pagarCredito(debtMembership);
  }

  public pagarCredito(membership: any) {
    const debt = Number(membership?.credit_used) || 0;
    if (debt <= 0) {
      this.mostrarToast('No tienes deuda pendiente para abonar.', 'toast-error');
      return;
    }
    this._emisionService.paymentData = membership;
    this.router.navigate(['/admin/pagar-deuda']);
  }

  // private async loadCustomer() {
  //   try {
  //     const data = {
  //       bank: "94932663-923d-48a3-b13a-6b0bea8f3608",
  //       "channel": "eea602fb-749e-460a-9805-9f993fc0036a",
  //       "terminal": "0",
  //       "ip": "127.0.0.1",
  //       "clientid": {
  //         doctype: this._emisionService.data_user.prefix || '',
  //         docid: +this._emisionService?.data_user?.rif || ''
  //       }
  //     }
  //     this.meritopService.customerProduct(data).subscribe({
  //       next: (result: any) => {
  //         this.customer_data = result;
  //         if (this.customer_data) {
  //           this.showLoading = false;
  //           this.firstName =
  //           result.basicdata.firstname + ' ' + result.basicdata.lastname;
  //           this.membershipName = result.products[0].name;
  //           this.amountTotal = result.products[0].available;
  //         }
  //       },
  //       error: (error) => {
  //         console.error('Error al obtener los clientes' + error);
  //       },
  //     });
  //   } catch (e) {
  //     console.error(e);
  //   }
  // }

  private UserVerifyMembership(rif: string){
      const data = {
        cedula: rif
      }

      this.emission.userIsActive(data).subscribe({
        next: (response: any) => {
          
          // Si el usuario no tiene membresia lo enviamos a los planes para que compre una
          if (response.total === 0) {
            this.navCtrl.navigateRoot(['/admin/planes/home/user']);
            this.showLoading = false;
          } 
 
          this.showLoading = false;
    
        },
        error: (err: any) => {

          console.log(err)
          // En Inicio no bloqueamos la UX por fallas de red/servidor.
          // Si esta validación falla, el usuario igual puede ver su dashboard.
          this.showLoading = false;
        },
      });
    }


  ngOnInit() {
    this.showLoading = true;
    this.loadState = { membership: false, meritop: false, pendingOrders: false };
    const dataUser : any = sessionStorage.getItem('accessToken')
    const decodeData: any = jwtDecode(dataUser)
    console.log(decodeData)
    this.username = decodeData?.name + ' ' + decodeData?.sub_ape
    this.UserVerifyMembership(decodeData.rif)

    // Placa por defecto: preferimos `userData` (localStorage). Fallback: token.
    try {
      const raw = localStorage.getItem('userData');
      const ud = raw ? JSON.parse(raw) : null;
      const plateFromUserData = String(ud?.plate || ud?.placa || ud?.vehicle_plate || '').trim();
      const plateFromToken = String(decodeData?.plate || decodeData?.placa || '').trim();
      const plate = plateFromUserData || plateFromToken;
      if (plate) {
        this.defaultPlate = plate;
        this.waPlate = plate;
        this.buyPlate = plate;
      }
    } catch {
      // noop
    }

    const pendingFromCache = this.meritopCache.readPendingOrders();
    if (pendingFromCache.length > 0) {
      this.pendingOrdersCount = pendingFromCache.length;
      this.hasPendingOrder = true;
    }

    const stored = sessionStorage.getItem('id_member')
    const idMember = stored
      ? Number(stored)
      : decodeData?.id_member != null
        ? Number(decodeData.id_member)
        : null
    if (idMember) {
      this.getMembershipById(idMember)
    } else if (decodeData?.email) {
      this.getMembershipByEmail(String(decodeData.email))
    } else {
      this.loadState.membership = true;
      // Si no hay id/email, no hay órdenes que cargar.
      this.loadState.pendingOrders = true;
      this.finishIfReady();
    }
  }

  /** Sincroniza `localStorage.userData` con la fila actual del API de membresía (certificado, plan, crédito, etc.). */
  private syncUserDataFromMembershipRows(): void {
    const first = this.data_membership?.[0];
    if (first) {
      this._emisionService.mergeUserDataFromMembership(first);
    }
  }

  private getMembershipById(idMember: number){
    try{
      this.arys_service.get_membership(idMember).subscribe({
        next: async (result) => {
          this.data_membership =
            result?.status && Array.isArray(result.data) ? result.data : [];
          const first = this.data_membership?.[0];
          if (first?.id_master != null) {
            sessionStorage.setItem('id_member', String(first.id_master));
          }

          await this.checkPendingOrders();
          this.syncUserDataFromMembershipRows();
          this.loadMeritopSummary();

          this.loadState.membership = true;
          this.finishIfReady();
        },
        error: async (error) => {
          this.data_membership = [];
          await this.checkPendingOrders();
          this.syncUserDataFromMembershipRows();
          this.loadMeritopSummary();
          this.loadState.membership = true;
          this.finishIfReady();
          console.log(error);
        }
      })
    }catch(e){
      console.error(e);     
    }
  }

  private getMembershipByEmail(email: string) {
    try {
      this.arys_service.get_membership_by_email(email).subscribe({
        next: async (result) => {
          this.data_membership =
            result?.status && Array.isArray(result.data) ? result.data : [];
          const first = this.data_membership?.[0];
          if (first?.id_master != null) {
            sessionStorage.setItem('id_member', String(first.id_master));
          }

          await this.checkPendingOrders();
          this.syncUserDataFromMembershipRows();
          this.loadMeritopSummary();

          this.loadState.membership = true;
          this.finishIfReady();
        },
        error: async () => {
          this.data_membership = [];
          await this.checkPendingOrders();
          this.syncUserDataFromMembershipRows();
          this.loadMeritopSummary();
          this.loadState.membership = true;
          this.finishIfReady();
        }
      })
    } catch (e) {
      console.error(e)
      this.data_membership = [];
      this.loadState.membership = true;
      this.loadState.pendingOrders = true;
      this.loadMeritopSummary();
      this.finishIfReady();
    }
  }

  public solicitarCredito(membership: any) {
  console.log('Iniciando solicitud para:', membership.name);
  // Aquí rediriges a la pantalla de solicitud de crédito de Meritop
  this.router.navigate(['/admin/Customer/create/sarys/meritop'], {
    queryParams: { id: membership.id_master },
  });
}

    private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainer-dashoard');
    if (!toastContainer) return;

    toastContainer.innerHTML = '';

    const toast = this.renderer.createElement('div');
    this.renderer.addClass(toast, estilo);

    const toastContent = this.renderer.createElement('div');
    this.renderer.addClass(toastContent, 'toast-content');

    const icon = this.renderer.createElement('span');
    this.renderer.addClass(icon, 'toast-icon');

    const errorIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    const successIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
    if (estilo === 'toast-error') {
      this.renderer.setProperty(icon, 'innerHTML', errorIconSVG);
    } else if (estilo === 'toast-success') {
      this.renderer.setProperty(icon, 'innerHTML', successIconSVG);
    }
    const text = this.renderer.createElement('span');
    this.renderer.setProperty(text, 'innerHTML', mensaje);
    this.renderer.appendChild(toastContent, icon);
    this.renderer.appendChild(toastContent, text);
    this.renderer.appendChild(toast, toastContent);
    this.renderer.appendChild(toastContainer, toast);
    setTimeout(() => {
      this.renderer.removeChild(toastContainer, toast);
    }, 6000);
  }
}
