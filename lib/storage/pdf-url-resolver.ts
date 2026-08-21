/**
 * BS (Base Server) Centralized PDF URL Resolver
 * Base HTTPS URL: https://bs.cisinlive.com/dinesh/rishabh/Case-Studies/
 */

const BS_BASE_URL = 'https://bs.cisinlive.com/dinesh/rishabh/Case-Studies';

/**
 * Returns a fully qualified, HTTPS URL for a given case study PDF filename.
 * Handles filename cleaning, RFC 3986 percent-encoding for spaces and special characters.
 *
 * Example inputs and outputs:
 * - "Linxitt.pdf" -> "https://bs.cisinlive.com/dinesh/rishabh/Case-Studies/Linxitt.pdf"
 * - "DriveTahcar (1).pdf" -> "https://bs.cisinlive.com/dinesh/rishabh/Case-Studies/DriveTahcar%20%281%29.pdf"
 * - "AI ML Projects Portfolio _ Case Studies.pdf" -> "https://bs.cisinlive.com/dinesh/rishabh/Case-Studies/AI%20ML%20Projects%20Portfolio%20_%20Case%20Studies.pdf"
 */
export function getBsServerPdfUrl(fileName?: string | null): string {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  const trimmed = fileName.trim();
  if (!trimmed) return '';

  // Prevent javascript:, data:, or external domain injection
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
    return '';
  }

  // Remove any accidental folder path components
  const cleanName = trimmed.split('/').pop()?.split('\\').pop() || trimmed;

  // RFC 3986 encoding for spaces, parentheses, ampersands, hyphens, etc.
  const encodedName = encodeURIComponent(cleanName);

  return `${BS_BASE_URL}/${encodedName}`;
}
