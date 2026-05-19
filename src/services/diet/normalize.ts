/**
 * Normalize an ingredient string for matching:
 * - lowercase
 * - strip diacritics (kiełbasa -> kielbasa)
 * - collapse punctuation to spaces (apostrophes become spaces so contractions tokenize consistently)
 * - collapse whitespace
 */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/\u0142/g, 'l') // Polish ł — does not NFD-decompose to plain l
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks
    .replace(/'/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize normalized text into word tokens.
 * Hyphens are preserved ("plant-based" stays one token; phrase lexicons include both hyphenated and spaced forms).
 */
export function tokenize(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}
