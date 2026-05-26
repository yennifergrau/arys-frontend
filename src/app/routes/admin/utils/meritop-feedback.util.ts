/** Interpreta respuestas Meritop (pago, consumo, etc.) para mensajes al usuario. */
export function isMeritopOperationFailed(res: unknown): boolean {
  if (res == null) return true;
  if (typeof res !== 'object') return false;
  const r = res as Record<string, unknown>;
  if (r['status'] === false || r['status'] === 'false' || r['success'] === false) return true;
  if (r['error'] != null && String(r['error']).trim() !== '') return true;
  const errObj = r['error'];
  if (errObj && typeof errObj === 'object' && (errObj as Record<string, unknown>)['message']) {
    return true;
  }
  return false;
}

export function getMeritopOperationMessage(res: unknown, fallback: string): string {
  if (res == null) return fallback;
  if (typeof res !== 'object') return fallback;
  const r = res as Record<string, unknown>;
  const direct = r['message'];
  if (direct != null && String(direct).trim() !== '') return String(direct).trim();
  const err = r['error'];
  if (typeof err === 'string' && err.trim()) return err.trim();
  if (err && typeof err === 'object') {
    const nested = (err as Record<string, unknown>)['message'];
    if (nested != null && String(nested).trim() !== '') return String(nested).trim();
  }
  return fallback;
}
