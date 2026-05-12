/** Tags shown in the hero should not repeat category (e.g. beef) or origin/cuisine. */
export function dedupeRecipeTags(
  tags: string[],
  category?: string,
  area?: string,
): string[] {
  const cat = category?.trim().toLowerCase() ?? '';
  const ar = area?.trim().toLowerCase() ?? '';
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    if (cat && t === cat) continue;
    if (ar && t === ar) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
