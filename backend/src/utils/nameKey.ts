// Canonical form used to compare names: "ADMin", " admin " and "Admín" are the
// same role, so two roles can never differ only by case, accents or spaces.
export function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
