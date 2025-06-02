import { validate, format, clean } from 'rut.js';

export function validateRut(rut: string): boolean {
  return validate(rut);
}

export function formatRut(rut: string): string {
  return format(rut);
}

export function cleanRut(rut: string): string {
  return clean(rut);
}

export function isValidRut(rut: string | null | undefined): boolean {
  if (!rut) return false;
  return validate(rut);
}