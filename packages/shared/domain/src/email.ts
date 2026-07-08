// Stub for v4 compatibility
export type Email = string & { readonly __brand: unique symbol }

export const Email = {
  make: (value: string): Email => value as Email,
  isValid: (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
}
