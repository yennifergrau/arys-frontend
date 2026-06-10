import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { environment } from 'src/environments/environment';
import { DataArysService } from '../services/data-arys.service';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';

type ServiceOption = {
  id: string;
  label: string;
  description?: string;
  selected: boolean;
};

@Component({
  selector: 'app-service-request',
  templateUrl: './service-request.page.html',
  styleUrls: ['./service-request.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
})
export class ServiceRequestPage implements OnInit {
  private navCtrl = inject(NavController);
  private arys = inject(DataArysService);
  private route = inject(ActivatedRoute);
  private tokenStore = inject(TokenStoreService);

  public username = '';
  public docLabel = '';
  public membershipCertificate = '';
  public membershipPlanLabel: string = '';
  public location = '';
  public plate = '';
  public reference = '';
  public notes = '';
  public showPreview: boolean = false;
  public showDetails: boolean = false;

  readonly locationChips = [
    { label: 'Autopista', value: 'Autopista' },
    { label: 'En casa', value: 'En casa' },
    { label: 'Trabajo', value: 'Trabajo' },
    { label: 'Centro comercial', value: 'Centro comercial' },
    { label: 'Estacionamiento', value: 'Estacionamiento' },
  ];

  private readonly situationChipsMap: Record<string, Array<{ label: string; value: string }>> = {
    grua: [
      { label: 'Sin arranque', value: 'Vehículo no enciende / sin arranque' },
      { label: 'Accidente', value: 'Accidente o choque' },
      { label: 'Traslado a taller', value: 'Necesito traslado a taller' },
      { label: 'Con pasajeros', value: 'Hay pasajeros en el vehículo' },
      { label: 'Varado en vía', value: 'Estoy varado en vía' },
      { label: 'Zona segura', value: 'Estoy en zona segura' },
      { label: 'URGENTE', value: '⚠️ URGENTE - necesito atención inmediata' },
    ],
    bateria: [
      { label: 'Sin arranque', value: 'No enciende, batería descargada' },
      { label: 'Arranque lento', value: 'El arranque está lento / batería débil' },
      { label: 'Luces débiles', value: 'Luces débiles, posible batería baja' },
      { label: 'Paso corriente', value: 'Necesito paso de corriente' },
      { label: 'Zona segura', value: 'Estoy en zona segura' },
      { label: 'URGENTE', value: '⚠️ URGENTE - necesito atención inmediata' },
    ],
    caucho: [
      { label: 'Pinchazo', value: 'Llanta pinchada' },
      { label: 'Reventón', value: 'Reventón de llanta' },
      { label: 'Sin repuesto', value: 'No tengo caucho de repuesto' },
      { label: 'Rueda trancada', value: 'Rueda trancada / no gira' },
      { label: 'Zona segura', value: 'Estoy en zona segura' },
      { label: 'URGENTE', value: '⚠️ URGENTE - necesito atención inmediata' },
    ],
    gasolina: [
      { label: 'Sin gasolina', value: 'Me quedé sin combustible' },
      { label: 'Sin gasoil', value: 'Me quedé sin gasoil' },
      { label: 'Varado en vía', value: 'Estoy varado en vía' },
      { label: 'Autopista', value: 'Estoy detenido en autopista' },
      { label: 'Zona segura', value: 'Estoy en zona segura' },
      { label: 'URGENTE', value: '⚠️ URGENTE - necesito atención inmediata' },
    ],
    cerrajero: [
      { label: 'Llaves adentro', value: 'Las llaves quedaron dentro del vehículo' },
      { label: 'Llave rota', value: 'La llave se rompió en la cerradura' },
      { label: 'Llave perdida', value: 'Perdí la llave del vehículo' },
      { label: 'Cerradura dañada', value: 'La cerradura está dañada / no abre' },
      { label: 'URGENTE', value: '⚠️ URGENTE - necesito atención inmediata' },
    ],
    mecanica: [
      { label: 'Sin arranque', value: 'El vehículo no enciende' },
      { label: 'Ruido extraño', value: 'Hace un ruido inusual al arrancar o conducir' },
      { label: 'Se recalentó', value: 'El motor se recalentó / temperatura alta' },
      { label: 'Humo', value: 'Hay humo saliendo del motor' },
      { label: 'No acelera', value: 'El vehículo no acelera con normalidad' },
      { label: 'Zona segura', value: 'Estoy en zona segura' },
      { label: 'URGENTE', value: '⚠️ URGENTE - necesito atención inmediata' },
    ],
  };

  public get situationChips(): Array<{ label: string; value: string }> {
    const id = this.options.find(o => o.selected)?.id ?? '';
    return this.situationChipsMap[id] ?? [];
  }

  public options: ServiceOption[] = [
    { id: 'grua', label: 'Grúa', description: 'Remolque / traslado', selected: false },
    { id: 'bateria', label: 'Batería', description: 'Paso de corriente / asistencia', selected: false },
    { id: 'caucho', label: 'Cambio de caucho', description: 'Asistencia por pinchazo', selected: false },
    { id: 'gasolina', label: 'Suministro de gasolina', description: 'Asistencia por falta de combustible', selected: false },
    { id: 'cerrajero', label: 'Cerrajero', description: 'Apertura de vehículo', selected: false },
    { id: 'mecanica', label: 'Mecánica ligera', description: 'Revisión básica en sitio', selected: false },
  ];

  public get selectedCount(): number {
    return this.options.reduce((acc, o) => acc + (o.selected ? 1 : 0), 0);
  }

  /** Selección única: deja solo 1 servicio marcado. */
  public selectOption(opt: ServiceOption): void {
    const before = this.selectedCount;
    const willSelect = !opt.selected;
    this.options.forEach(o => (o.selected = false));
    opt.selected = willSelect;
    const after = this.selectedCount;
    if (before === 0 && after > 0) {
      // Primer servicio seleccionado: guiamos al usuario al paso 2.
      setTimeout(() => this.scrollTo('sr-step-2'), 50);
    }
  }

  public get selectedOptions(): ServiceOption[] {
    return this.options.filter(o => o.selected);
  }

  public removeOption(opt: ServiceOption): void {
    opt.selected = false;
  }

  public addLocationPreset(text: string): void {
    const t = String(text || '').trim();
    if (!t) return;
    if (!this.location.trim()) {
      this.location = t;
      return;
    }
    if (this.location.toLowerCase().includes(t.toLowerCase())) return;
    this.location = `${this.location.trim()} · ${t}`;
  }

  public addNotePreset(text: string): void {
    const t = String(text || '').trim();
    if (!t) return;
    if (!this.notes.trim()) {
      this.notes = t;
      return;
    }
    if (this.notes.toLowerCase().includes(t.toLowerCase())) return;
    this.notes = `${this.notes.trim()}. ${t}`;
  }

  public useMyLocation(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => { this.location = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`; },
      () => { /* silencioso */ }
    );
  }

  public clearAll(): void {
    this.options.forEach(o => (o.selected = false));
    this.location = '';
    this.plate = '';
    this.reference = '';
    this.notes = '';
    this.showPreview = false;
    this.showDetails = false;
    setTimeout(() => this.scrollTo('sr-top'), 50);
  }

  public get currentStep(): 1 | 2 | 3 {
    const hasService = this.selectedCount > 0;
    const hasLocationData =
      this.location.trim().length > 0 ||
      this.plate.trim().length > 0 ||
      this.reference.trim().length > 0 ||
      this.notes.trim().length > 0;

    if (this.showPreview || (hasService && hasLocationData)) return 3;
    if (hasService) return 2;
    return 1;
  }

  public get progressPercent(): number {
    const step = this.currentStep;
    if (step === 1) return 33;
    if (step === 2) return 66;
    return 100;
  }

  public scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  public get canSend(): boolean {
    return (
      this.options.some(o => o.selected) ||
      this.location.trim().length > 0 ||
      this.plate.trim().length > 0 ||
      this.reference.trim().length > 0 ||
      this.notes.trim().length > 0
    );
  }

  private buildWhatsappUrl(text: string): string | null {
    const raw = environment.contact?.whatsappPhone ?? '';
    const phone = raw.replace(/\D/g, '');
    if (phone.length < 10) return null;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  public buildMessage(): string {
    const chosen = this.options.find(o => o.selected)?.label ?? '';
    const lines = [
      'Hola, buen día. Quiero solicitar un servicio.',
      '',
      this.username ? `Cliente: ${this.username}` : '',
      this.docLabel ? `Documento: ${this.docLabel}` : '',
      this.membershipCertificate ? `Certificado: ${this.membershipCertificate}` : '',
      this.membershipPlanLabel ? `Plan: ${this.membershipPlanLabel}` : '',
      this.plate.trim() ? `Placa: ${this.plate.trim().toUpperCase()}` : '',
      this.location.trim() ? `Ubicación: ${this.location.trim()}` : '',
      this.reference.trim() ? `Referencia: ${this.reference.trim()}` : '',
      '',
      chosen ? `Servicio: ${chosen}` : '',
      this.notes.trim() ? `\nNotas:\n${this.notes.trim()}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  }

  private resolvePlanLabelFromCertificate(certificate: string): string {
    const cert = String(certificate || '').trim();
    const m = cert.match(/^(\d+)\s*-/);
    if (!m) return '';
    const productId = Number(m[1]);
    if (!Number.isFinite(productId) || productId <= 0) return '';
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

  public sendWhatsapp(): void {
    const msg = this.buildMessage();
    const url = this.buildWhatsappUrl(msg);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  public togglePreview(): void {
    this.showPreview = !this.showPreview;
    if (this.showPreview) {
      setTimeout(() => this.scrollTo('sr-step-3'), 50);
    }
  }

  public goBack(): void {
    this.navCtrl.back();
  }

  ngOnInit(): void {
    const preselect = String(this.route.snapshot.queryParamMap.get('service') || '').trim().toLowerCase();
    if (preselect) {
      const opt = this.options.find(o => o.id === preselect);
      if (opt) {
        this.selectOption(opt);
      }
    }

    const storedMember = sessionStorage.getItem('id_member');
    const token = this.tokenStore.getAccessTokenSync();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.username = [decoded?.name, decoded?.sub_ape].filter(Boolean).join(' ').trim();
        const doctype = String(decoded?.doctype || decoded?.prefix || '').trim();
        const docid = String(decoded?.docid || decoded?.rif || '').trim();
        this.docLabel = [doctype, docid].filter(Boolean).join('-');

        const plateFromToken = String(decoded?.plate || decoded?.placa || '').trim();
        if (plateFromToken) {
          this.plate = plateFromToken;
        }
      } catch {
        // noop
      }
    }

    // Preferimos el certificado real desde membership (si está disponible).
    // Fallback: si el usuario viene de compra, `numberContract` suele traer `certificado`.
    try {
      const ncRaw = localStorage.getItem('numberContract');
      const nc = ncRaw ? JSON.parse(ncRaw) : null;
      const cert = nc?.certificado != null ? String(nc.certificado).trim() : '';
      if (cert) {
        this.membershipCertificate = cert;
        this.membershipPlanLabel = this.resolvePlanLabelFromCertificate(cert);
      }
    } catch {
      // noop
    }

    if (this.membershipCertificate) return;
    if (!storedMember) return;

    const idMember = Number(storedMember);
    if (Number.isNaN(idMember) || idMember <= 0) return;

    this.arys.get_membership(idMember).subscribe({
      next: (res: any) => {
        const first = res?.status && Array.isArray(res.data) ? res.data[0] : null;
        const cert = first?.certificate != null ? String(first.certificate).trim() : '';
        if (cert) {
          this.membershipCertificate = cert;
          this.membershipPlanLabel = this.resolvePlanLabelFromCertificate(cert);
        }
      },
      error: () => {
        // noop
      }
    });
  }
}

