import { NextRequest, NextResponse } from 'next/server';
import { checkBarangay } from './geofencing';

export async function withGeofence(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return handler(request);
}

export function validateQueryBarangay(barangay: string | null): { valid: boolean; error?: string } {
  if (!barangay) {
    return { valid: false, error: 'Barangay query parameter is required' };
  }
  return checkBarangay(barangay);
}

export function filterByCotabatoCityBarangay<T extends { barangay?: string | null }>(
  records: T[]
): T[] {
  return records.filter((record) => {
    if (!record.barangay) return false;
    return checkBarangay(record.barangay).valid;
  });
}