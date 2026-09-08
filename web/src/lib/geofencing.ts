import { COTABATO_BARANGAYS, type Barangay } from './constants';

export { type Barangay };

export class GeofenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeofenceError';
  }
}

export function validateBarangay(barangay: string | null | undefined): void {
  if (!barangay) {
    throw new GeofenceError('Barangay is required');
  }

  const normalizedBarangay = barangay.trim();
  const isValid = COTABATO_BARANGAYS.some(
    (b) => b.toLowerCase() === normalizedBarangay.toLowerCase()
  );

  if (!isValid) {
    throw new GeofenceError(
      `Invalid barangay "${barangay}". Only Cotabato City barangays are allowed: ${COTABATO_BARANGAYS.join(', ')}`
    );
  }
}

export function isValidBarangay(barangay: string | null | undefined): boolean {
  if (!barangay) return false;
  const normalizedBarangay = barangay.trim();
  return COTABATO_BARANGAYS.some(
    (b) => b.toLowerCase() === normalizedBarangay.toLowerCase()
  );
}

export function getValidBarangays(): readonly string[] {
  return COTABATO_BARANGAYS;
}

export function getCotabatoCityName(): string {
  return 'Cotabato City';
}

export function getCotabatoCityRegion(): string {
  return 'BARMM';
}

export function getCotabatoCityProvince(): string {
  return 'Maguindanao';
}

export interface GeofenceCheckResult {
  valid: boolean;
  error?: string;
}

export function checkBarangay(barangay: string | null | undefined): GeofenceCheckResult {
  try {
    validateBarangay(barangay);
    return { valid: true };
  } catch (e) {
    const error = e instanceof GeofenceError ? e.message : 'Invalid barangay';
    return { valid: false, error };
  }
}