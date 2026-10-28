import { Capacitor } from '@capacitor/core';

function isIosWeb(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Si ya está compilada como App nativa de iOS (App Store / Capacitor), Capacitor maneja window.open nativamente
  if (Capacitor.isNativePlatform()) return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isAppleMobile = /iPad|iPhone|iPod/i.test(ua);
  const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isAppleMobile || isIpadOS;
}

export function openWhatsapp(options: { phone?: string; text: string }): void {
  const cleanPhone = (options.phone ?? '').replace(/\D/g, '');
  const encodedText = encodeURIComponent(options.text);

  if (isIosWeb()) {
    const schemeUrl = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;
    window.location.href = schemeUrl;
    return;
  }

  const webUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

export function openWhatsappUrl(url: string): void {
  if (isIosWeb()) {
    const waMeMatch = url.match(/^https?:\/\/wa\.me\/(\d+)\?text=(.*)$/i);
    if (waMeMatch) {
      window.location.href = `whatsapp://send?phone=${waMeMatch[1]}&text=${waMeMatch[2]}`;
      return;
    }
    const apiMatch = url.match(/^https?:\/\/api\.whatsapp\.com\/send\?(.*)$/i);
    if (apiMatch) {
      window.location.href = `whatsapp://send?${apiMatch[1]}`;
      return;
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
