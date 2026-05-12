/**
 * Map MealDB `strArea` and common Spoonacular cuisine strings to ISO 3166-1 alpha-2
 * for flag emoji (no flag when unknown or regional labels like "Middle Eastern").
 */
const ORIGIN_TO_ISO: Record<string, string> = {
  american: 'US',
  british: 'GB',
  canadian: 'CA',
  chinese: 'CN',
  croatian: 'HR',
  dutch: 'NL',
  egyptian: 'EG',
  french: 'FR',
  greek: 'GR',
  indian: 'IN',
  irish: 'IE',
  italian: 'IT',
  jamaican: 'JM',
  japanese: 'JP',
  kenyan: 'KE',
  malaysian: 'MY',
  mexican: 'MX',
  moroccan: 'MA',
  polish: 'PL',
  portuguese: 'PT',
  russian: 'RU',
  spanish: 'ES',
  thai: 'TH',
  tunisian: 'TN',
  turkish: 'TR',
  vietnamese: 'VN',
  argentinian: 'AR',
  filipino: 'PH',
  norwegian: 'NO',
  syrian: 'SY',
  venezuela: 'VE',
  venezuelan: 'VE',
  uruguayan: 'UY',
  singaporean: 'SG',
  indonesian: 'ID',
  saudi: 'SA',
  pakistani: 'PK',
  bangladeshi: 'BD',
  iranian: 'IR',
  lebanese: 'LB',
  israeli: 'IL',
  korean: 'KR',
  mongolian: 'MN',
  ukrainian: 'UA',
  german: 'DE',
  austrian: 'AT',
  swiss: 'CH',
  swedish: 'SE',
  danish: 'DK',
  finnish: 'FI',
  hungarian: 'HU',
  romanian: 'RO',
  bulgarian: 'BG',
  serbian: 'RS',
  bosnian: 'BA',
  czech: 'CZ',
  slovak: 'SK',
  belgian: 'BE',
  'south african': 'ZA',
  zimbabwean: 'ZW',
  colombian: 'CO',
  peruvian: 'PE',
  chilean: 'CL',
  cuban: 'CU',
  brazilian: 'BR',
  persian: 'IR',
  scottish: 'GB',
  welsh: 'GB',
  english: 'GB',
};

export function iso3166Alpha2ToFlagEmoji(code: string): string {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  const base = 0x1f1e6;
  return [...cc]
    .map((c) => String.fromCodePoint(base + (c.charCodeAt(0) - 65)))
    .join('');
}

/** Flag emoji for recipe area/cuisine label, or empty string if unknown. */
export function flagEmojiForOrigin(origin?: string | null): string {
  if (!origin?.trim()) return '';
  const key = origin.trim().toLowerCase().replace(/\s+/g, ' ');
  const iso = ORIGIN_TO_ISO[key];
  if (!iso) return '';
  return iso3166Alpha2ToFlagEmoji(iso);
}

export function formatOriginLabel(origin: string): string {
  const s = origin.trim();
  if (!s) return s;
  return s.replace(/\w+/g, (w) => {
    const lower = w.toLowerCase();
    if (lower === 'of' || lower === 'and') return lower;
    return w.charAt(0).toUpperCase() + lower.slice(1);
  });
}
