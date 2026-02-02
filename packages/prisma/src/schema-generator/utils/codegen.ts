/**
 * Code generation utilities
 */

/**
 * Generate standard file header for generated files
 *
 * @param timestamp - Optional timestamp (defaults to current time)
 */
export function generateFileHeader(timestamp: Date = new Date()) {
  return `/**
 * Generated: ${timestamp.toISOString()}
 * DO NOT EDIT MANUALLY
 */`;
}
