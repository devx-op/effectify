import type { IsEmailOptions } from 'validator/lib/isEmail.js'
import isEmail from 'validator/lib/isEmail.js'

/**
 * Validate emails according to RFC 5322
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isValidEmail = isEmail as any as (str: string, options?: IsEmailOptions) => boolean
