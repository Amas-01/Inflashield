/**
 * Input sanitisation and validation utilities
 *
 * These functions are the primary input security layer. They validate, reject,
 * and never coerce. Invalid input is never "fixed" — it is rejected.
 *
 * All functions are pure, synchronous, and throw AppError on invalid input.
 */

import type { RiskLevel, AppError, AppErrorCode } from '@/lib/types'

/**
 * Throw a standardised AppError for validation failures.
 */
function throwValidationError(code: AppErrorCode, message: string): never {
  const error = new Error(message) as any
  error.code = code
  error.retryable = false
  throw error
}

/**
 * Validate a currency code (ISO 4217 three-letter code).
 *
 * Rejects:
 * - Non-strings
 * - Strings that are not exactly 3 characters
 * - Lowercase or mixed-case letters
 * - Non-alphabetic characters
 *
 * @param input - Untrusted string to validate
 * @returns Uppercase ISO 4217 code
 * @throws AppError with code INVALID_CURRENCY
 */
export function sanitiseCurrency(input: unknown): string {
  const regex = /^[A-Z]{3}$/
  if (typeof input !== 'string' || !regex.test(input)) {
    throwValidationError('INVALID_CURRENCY', `Currency must be a 3-letter code (e.g., USD, NGN). Got: ${String(input)}`)
  }
  return input
}

/**
 * Validate an amount in USD or equivalent.
 *
 * Bounds:
 * - Minimum: $0.01
 * - Maximum: $1,000,000,000 (one billion)
 *
 * Rejects:
 * - Negative numbers
 * - NaN, Infinity, -Infinity
 * - Non-numeric strings
 * - Non-numbers
 *
 * @param input - Untrusted number or numeric string
 * @returns Normalized number
 * @throws AppError with code INVALID_AMOUNT
 */
export function sanitiseAmount(input: unknown): number {
  let num: number

  if (typeof input === 'string') {
    num = parseFloat(input)
  } else if (typeof input === 'number') {
    num = input
  } else {
    throwValidationError('INVALID_AMOUNT', `Amount must be a number. Got: ${typeof input}`)
  }

  if (!isFinite(num)) {
    throwValidationError('INVALID_AMOUNT', `Amount must be finite. Got: ${input}`)
  }

  if (num < 0.01 || num > 1_000_000_000) {
    throwValidationError(
      'INVALID_AMOUNT',
      `Amount must be between $0.01 and $1,000,000,000. Got: ${num}`,
    )
  }

  return num
}

/**
 * Validate a risk level.
 *
 * Must be exactly one of: conservative | balanced | aggressive
 *
 * @param input - Untrusted value
 * @returns Validated RiskLevel
 * @throws AppError with code INVALID_RISK_LEVEL
 */
export function sanitiseRiskLevel(input: unknown): RiskLevel {
  const valid: RiskLevel[] = ['conservative', 'balanced', 'aggressive']
  if (!valid.includes(input as RiskLevel)) {
    throwValidationError(
      'INVALID_RISK_LEVEL',
      `Risk level must be one of: conservative, balanced, aggressive. Got: ${String(input)}`,
    )
  }
  return input as RiskLevel
}

/**
 * Validate a BCP 47 language/locale tag (optional).
 *
 * Format: aa | aa-BB | aaa | aaa-BBB where:
 * - a = lowercase letter (language code)
 * - B = uppercase letter (region code, optional)
 *
 * Examples: en, en-US, zh-Hans, pt-BR
 *
 * Returns undefined (not an error) if invalid — locale is non-critical.
 * A malformed locale simply falls back to defaults.
 *
 * @param input - Untrusted value
 * @returns Validated BCP 47 code, or undefined if invalid/missing
 */
export function sanitiseLocale(input: unknown): string | undefined {
  if (input === undefined || input === null) {
    return undefined
  }

  if (typeof input !== 'string') {
    return undefined
  }

  const maxLen = 10
  if (input.length > maxLen) {
    return undefined
  }

  // BCP 47 pattern: 2–3 letter language code, optionally followed by - and 2–3 letter region
  const regex = /^[a-z]{2,3}(-[A-Z]{2,3})?$/
  if (!regex.test(input)) {
    return undefined
  }

  return input
}

/**
 * Validate and sanitise an index ID.
 *
 * Must be 1–100 characters, containing only alphanumeric, hyphen, underscore.
 *
 * @param input - Untrusted ID
 * @returns Validated ID
 * @throws AppError with code INVALID_CURRENCY (generic validation error)
 */
export function sanitiseIndexId(input: unknown): string {
  if (typeof input !== 'string') {
    throwValidationError('INVALID_CURRENCY', `Index ID must be a string. Got: ${typeof input}`)
  }

  if (input.length < 1 || input.length > 100) {
    throwValidationError('INVALID_CURRENCY', `Index ID must be 1–100 characters. Got length ${input.length}`)
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
    throwValidationError(
      'INVALID_CURRENCY',
      `Index ID must only contain alphanumeric, hyphen, and underscore characters. Got: ${input}`,
    )
  }

  return input
}

/**
 * Validate an order type.
 *
 * Must be exactly 'market' or 'limit'.
 *
 * @param input - Untrusted value
 * @returns Validated order type
 * @throws AppError
 */
export function sanitiseOrderType(input: unknown): 'market' | 'limit' {
  if (input !== 'market' && input !== 'limit') {
    throwValidationError('INVALID_CURRENCY', `Order type must be 'market' or 'limit'. Got: ${String(input)}`)
  }
  return input
}

/**
 * Validate slippage tolerance (0–10%).
 *
 * @param input - Untrusted value
 * @returns Validated slippage (0–0.1)
 */
export function sanitiseSlippageTolerance(input: unknown): number {
  let num: number
  if (typeof input === 'string') {
    num = parseFloat(input)
  } else if (typeof input === 'number') {
    num = input
  } else {
    throwValidationError('INVALID_CURRENCY', `Slippage must be a number`)
  }

  if (!isFinite(num) || num < 0 || num > 0.1) {
    throwValidationError('INVALID_CURRENCY', `Slippage must be between 0 and 0.1 (10%). Got: ${num}`)
  }

  return num
}
