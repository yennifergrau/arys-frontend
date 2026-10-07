/** Interpreta respuestas Meritop (pago, consumo, etc.) para mensajes al usuario. */
export function isMeritopOperationFailed(res: unknown): boolean {
  // Cuerpo vacío tras HTTP 200 (p. ej. 204): no marcar como fallo.
  if (res == null) return false;
  if (typeof res !== 'object') return false;
  const r = res as Record<string, unknown>;

  if (r['status'] === true || r['status'] === 'true' || r['success'] === true) return false;
  if (r['status'] === 200 || r['status'] === '200') return false;

  if (typeof r['status'] === 'number' && r['status'] !== 200) return true;
  if (r['status'] === false || r['status'] === 'false' || r['success'] === false) return true;

  if (r['error'] != null && String(r['error']).trim() !== '') return true;
  const errObj = r['error'];
  if (errObj && typeof errObj === 'object') {
    const msg = (errObj as Record<string, unknown>)['message'];
    if (msg != null && String(msg).trim() !== '') return true;
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

/**
 * Determina si un mensaje devuelto por la operación corresponde a una advertencia
 * por ventana de espera/cooldown de pago (ej. pago reciente con los mismos datos de destino).
 */
export function isMeritopWarningMessage(message: unknown): boolean {
  if (!message || typeof message !== 'string') return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('5 minutos') ||
    normalized.includes('cinco minutos') ||
    (normalized.includes('mismos datos') && normalized.includes('destino'))
  );
}

/**
 * Normaliza el mensaje de advertencia asegurando que oriente al usuario
 * a esperar los 5 minutos requeridos antes de proceder.
 */
export function formatMeritopWarningMessage(message: string): string {
  if (!isMeritopWarningMessage(message)) return message;
  const lower = message.toLowerCase();
  if (lower.includes('espera') || lower.includes('espere')) {
    return message;
  }
  return `${message.trim().replace(/\.+$/, '')}. Por favor, espera que transcurran los 5 minutos antes de proceder.`;
}

