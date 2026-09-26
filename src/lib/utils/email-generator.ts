export function generateTypedFirebaseEmail(phone: string, countryCode: string = '+20', accountType: string = 'player'): string {
  const digits = String(phone || '').replace(/\D/g, '');
  const code = String(countryCode || '').replace(/\D/g, '') || '20';
  const normalized = digits.startsWith(code) ? digits : `${code}${digits.replace(/^0+/, '')}`;
  const type = String(accountType || 'player').toLowerCase().replace(/[^a-z0-9]/g, '') || 'player';
  return `${type}.${normalized}@el7lm.com`;
}
