import { jwtDecode } from 'jwt-decode';

export type MeritopClientIdentity = { doctype: string; docid: number };

/** Cédula del JWT (`prefix` + `rif`) en formato `V12345678`. */
export function userCedrifFromDecodedToken(decoded: unknown): string {
  if (!decoded || typeof decoded !== 'object') return '';
  const row = decoded as Record<string, unknown>;
  const prefix = String(row['prefix'] ?? row['doctype'] ?? row['letra_rif'] ?? '').trim();
  const rif = String(row['rif'] ?? row['docid'] ?? '').replace(/\D/g, '');
  return formatCedrifRif(prefix || 'V', rif);
}

/** Compara cédula de usuario con `cedrif_membership` de la fila. */
export function membershipMatchesUserCedrif(
  membershipRow: unknown,
  decodedToken: unknown
): boolean {
  if (!membershipRow || typeof membershipRow !== 'object') return false;
  const expected = userCedrifFromDecodedToken(decodedToken);
  if (!expected) return false;
  const parsed = parseCedrifCredit((membershipRow as Record<string, unknown>)['cedrif_membership']);
  if (!parsed) return false;
  return formatCedrifRif(parsed.doctype, parsed.docid) === expected;
}

export type PickActiveMembershipOptions = {
  idMember?: number | null;
  certificate?: string | null;
};

/** Una sola membresía activa: sesión → certificado Sarys → la más reciente. */
export function pickActiveMembershipRow(
  rows: unknown[],
  options?: PickActiveMembershipOptions
): Record<string, unknown> | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const idMember = Number(options?.idMember ?? 0);
  if (Number.isFinite(idMember) && idMember > 0) {
    const byId = rows.find(
      (row) =>
        row &&
        typeof row === 'object' &&
        Number((row as Record<string, unknown>)['id_master']) === idMember
    );
    if (byId && typeof byId === 'object') {
      return byId as Record<string, unknown>;
    }
  }

  const cert = options?.certificate != null ? String(options.certificate).trim() : '';
  if (cert) {
    const byCert = rows.find((row) => {
      if (!row || typeof row !== 'object') return false;
      const r = row as Record<string, unknown>;
      const rowCert = String(r['certificate'] ?? r['certificado'] ?? '').trim();
      return rowCert === cert;
    });
    if (byCert && typeof byCert === 'object') {
      return byCert as Record<string, unknown>;
    }
  }

  const first = rows[0];
  return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
}

export function certificateFromUserData(): string {
  try {
    const raw = localStorage.getItem('userData');
    const ud = raw ? JSON.parse(raw) : null;
    return String(ud?.certificate ?? ud?.certificado ?? '').trim();
  } catch {
    return '';
  }
}

/** Solo dígitos para POST `fechetd/status` (ClienteActivo). */
export function cedulaDigitsForSarysStatus(cedrif: string): string {
  return String(cedrif ?? '').replace(/\D/g, '');
}

/** Parsea `cedrif_credit` / `V15700584` → tipo + número para Meritop. */
export function parseCedrifCredit(raw: unknown): MeritopClientIdentity | null {
  const s = raw != null ? String(raw).trim() : '';
  if (!s) return null;
  const doctype = /^[a-zA-Z]/.test(s) ? s.charAt(0).toUpperCase() : 'V';
  const digits = s.replace(/^[a-zA-Z]/, '').replace(/\D/g, '');
  const docid = Number(digits);
  if (!Number.isFinite(docid) || docid <= 0) return null;
  return { doctype, docid };
}

/** Arma `rif` para API ARYS: `V` + `15700584` → `V15700584`. */
export function formatCedrifRif(doctype: string, docid: string | number): string {
  const prefix = String(doctype || 'V').trim().toUpperCase();
  const letter = /^[A-Z]/.test(prefix) ? prefix.charAt(0) : 'V';
  const digits = String(docid).replace(/\D/g, '');
  return digits ? `${letter}${digits}` : '';
}

/** Respuesta de `validate/credit-line`: true si ya hay línea y no debe abrir otra. */
export function creditLineValidationBlocks(res: unknown): { block: boolean; message: string } {
  if (!res || typeof res !== 'object') {
    return { block: false, message: '' };
  }
  const r = res as Record<string, unknown>;
  const msg = r['message'] != null ? String(r['message']).trim() : '';

  if (
    r['has_credit_line'] === true ||
    r['credit_line_exists'] === true ||
    r['exists'] === true ||
    r['already_exists'] === true
  ) {
    return {
      block: true,
      message: msg || 'Esta cédula ya tiene una línea de crédito activa.',
    };
  }

  if (r['status'] === false) {
    return {
      block: true,
      message: msg || 'Esta cédula ya tiene una línea de crédito activa.',
    };
  }

  if (r['can_open'] === false || r['available'] === false) {
    return {
      block: true,
      message: msg || 'No se puede abrir otra línea de crédito con esta cédula.',
    };
  }

  return { block: false, message: '' };
}

/** Línea activa: `credit_line_id` y `cedrif_credit` válidos. */
export function membershipHasCreditLine(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  const lineId = r['credit_line_id'];
  const hasLine = lineId != null && String(lineId).trim() !== '';
  return hasLine && parseCedrifCredit(r['cedrif_credit']) != null;
}

export type ResolveMeritopIdentityOptions = {
  membershipRows?: unknown[];
  membershipRow?: unknown;
  accessToken?: string | null;
};

/**
 * Identidad para endpoints Meritop (`client` / `clientid`).
 * Prioridad: `cedrif_credit` (membresía / userData) → JWT / userData (`rif`+`prefix`).
 */
export function resolveMeritopClientIdentity(
  options?: ResolveMeritopIdentityOptions
): MeritopClientIdentity | null {
  const fromRow = (row: unknown) =>
    row && typeof row === 'object'
      ? parseCedrifCredit((row as Record<string, unknown>)['cedrif_credit'])
      : null;

  if (options?.membershipRow) {
    const id = fromRow(options.membershipRow);
    if (id) return id;
  }

  if (Array.isArray(options?.membershipRows)) {
    for (const row of options.membershipRows) {
      const id = fromRow(row);
      if (id) return id;
    }
  }

  try {
    const raw = localStorage.getItem('userData');
    const userData = raw ? JSON.parse(raw) : null;
    const fromUser = parseCedrifCredit(userData?.cedrif_credit);
    if (fromUser) return fromUser;
  } catch {
    // noop
  }

  const token = options?.accessToken ?? null;
  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      const doctype = String(decoded?.doctype || decoded?.prefix || '').trim();
      const docid = Number(decoded?.docid || decoded?.rif || 0);
      if (doctype && docid > 0) return { doctype, docid };
    } catch {
      // noop
    }
  }

  try {
    const raw = localStorage.getItem('userData');
    const userData = raw ? JSON.parse(raw) : null;
    const doctype = String(
      userData?.doctype || userData?.prefix || userData?.letra_rif || ''
    ).trim();
    const docid = Number(userData?.docid || userData?.rif || 0);
    if (doctype && docid > 0) return { doctype, docid };
  } catch {
    // noop
  }

  return null;
}
