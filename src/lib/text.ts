/**
 * Utility di testo condivise fra listone, mercato e stato salvato.
 */

/** Decodifica le entità HTML numeriche e le poche nominali che compaiono nei listoni */
export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Chiave di confronto: niente accenti, niente punteggiatura, tutto minuscolo */
export function normalizeName(input: string): string {
  return decodeEntities(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

/**
 * Identificativo stabile di un calciatore.
 *
 * Deve dipendere da CHI è il giocatore, mai dalla sua posizione nel listone:
 * il listone cambia in continuazione durante il mercato e un id posizionale
 * farebbe puntare le rose salvate a un giocatore completamente diverso.
 */
export function stablePlayerId(season: string, name: string, team: string, role: string): string {
  return `p-${season}-${normalizeName(team)}-${role.toLowerCase()}-${normalizeName(name)}`;
}
