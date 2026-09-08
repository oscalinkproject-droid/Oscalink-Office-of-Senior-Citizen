export function normalizeFullName(fullName?: string | null): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (!trimmed.includes(',')) return trimmed;
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const last = parts.shift();
  const given = parts.join(' ');
  return last ? `${given} ${last}`.trim() : trimmed;
}

export const formatSeniorName = (lastName = '', firstName = '', middleName = '', suffix = '') => {
  const clean = (str: string) => (str || '').trim().replace(/\s+/g, ' ');

  const last = clean(lastName);
  const first = clean(firstName);
  const middle = clean(middleName);
  const suf = clean(suffix);

  const restParts = [first, middle, suf].filter(Boolean);

  const uniqueRest = restParts.filter((part, index) => restParts.indexOf(part) === index).join(' ');

  if (!last) return uniqueRest;
  if (!uniqueRest) return last;

  return `${last}, ${uniqueRest}`;
};
