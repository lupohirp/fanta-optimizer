/**
 * Gestione dinamica delle stagioni sportive di Serie A e Fantacalcio.
 * La stagione sportiva inizia a Luglio dell'anno N e termina a Giugno dell'anno N+1.
 */

export function getCurrentSeason(customDate?: Date): string {
  const now = customDate || new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Gennaio, 6 = Luglio, 7 = Agosto, 11 = Dicembre

  // Se siamo da Luglio in poi (mese >= 6), la stagione è anno / (anno+1)
  // Esempio: Agosto 2026 -> '2026-27', Agosto 2027 -> '2027-28'
  if (month >= 6) {
    const nextYearShort = (year + 1).toString().slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    // Se siamo da Gennaio a Giugno, siamo nella seconda metà della stagione iniziata l'anno prima
    const currentYearShort = year.toString().slice(-2);
    return `${year - 1}-${currentYearShort}`;
  }
}

export function formatSeasonLabel(seasonStr: string): string {
  // '2026-27' -> '2026/27'
  return seasonStr.replace('-', '/');
}

export function getPreviousSeason(seasonStr: string): string {
  // '2026-27' -> '2025-26'
  const startYear = parseInt(seasonStr.split('-')[0]);
  if (isNaN(startYear)) return '2025-26';
  const prevStartYear = startYear - 1;
  const prevEndYearShort = startYear.toString().slice(-2);
  return `${prevStartYear}-${prevEndYearShort}`;
}

export function getAvailableSeasons(): string[] {
  const current = getCurrentSeason();
  const currentStartYear = parseInt(current.split('-')[0]);
  const seasons: string[] = [];

  // Include la stagione successiva (se siamo vicini al cambio), quella corrente e le 3 precedenti
  for (let i = 1; i >= -3; i--) {
    const y = currentStartYear + i;
    const endY = (y + 1).toString().slice(-2);
    seasons.push(`${y}-${endY}`);
  }

  return seasons;
}
