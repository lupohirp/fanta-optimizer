import { Player, Role } from '../types';
import { MarketQuote } from './market';

/**
 * SORGENTE DEI PREZZI D'ASTA REALI (lato server)
 * ----------------------------------------------
 * Legge due pagine pubbliche dell'aggregatore di aste:
 *  - la tabella dei prezzi medi, divisa per formato di lega (8/10 squadre,
 *    350/500 crediti);
 *  - la tabella dei più comprati, che aggiunge quanto un giocatore è conteso
 *    (% di rose che lo possiedono) e il movimento di prezzo degli ultimi 7 giorni.
 *
 * I nomi non coincidono con quelli del listino ufficiale (COGNOME + Nome contro
 * "Rossi A."), quindi l'aggancio passa da un matcher dedicato.
 */

const PRICES_URL = 'https://www.fantacalcio-online.com/it/asta-fantacalcio-stima-prezzi';
const MOST_BOUGHT_URL = 'https://www.fantacalcio-online.com/it/i-piu-comprati';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface MarketRow {
  role: Role;
  team: string;
  surname: string;
  firstName: string;
  quote: MarketQuote;
}

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

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/<[^>]+>/g, '').replace(/\s|\+/g, '').replace(',', '.');
  if (!cleaned) return undefined;
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : undefined;
}

async function fetchPage(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 21600 }, // 6 ore: i prezzi medi si muovono lentamente
      headers: { 'User-Agent': UA }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const ROW_REGEX = /<tr>\s*<td class="player-pos"[\s\S]*?<\/tr>/g;
const ROLE_REGEX = /label-\d+">([PDCA])<\/span>/;
const TEAM_REGEX = /team-name">([^<]*)</;
const SURNAME_REGEX = /text-bold">([^<]*)<\/span>/;
const FIRSTNAME_REGEX = /text-muted">([^<]*)<\/span>/;
const CELL_REGEX = /vote-col-no"[^>]*>([\s\S]*?)<\/td>/g;

interface RawRow {
  role: Role;
  team: string;
  surname: string;
  firstName: string;
  cells: string[];
}

function parseRows(html: string): RawRow[] {
  const out: RawRow[] = [];
  const rows = html.match(ROW_REGEX) || [];
  for (const row of rows) {
    const role = ROLE_REGEX.exec(row)?.[1] as Role | undefined;
    const surname = SURNAME_REGEX.exec(row)?.[1]?.trim();
    if (!role || !surname) continue;
    const team = TEAM_REGEX.exec(row)?.[1]?.trim() || '';
    const firstName = FIRSTNAME_REGEX.exec(row)?.[1]?.trim() || '';
    const cells: string[] = [];
    CELL_REGEX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CELL_REGEX.exec(row)) !== null) cells.push(m[1]);
    out.push({ role, team, surname, firstName, cells });
  }
  return out;
}

/**
 * Scarica i prezzi d'asta reali. Le due pagine vengono lette in parallelo; se
 * quella secondaria (più comprati) non risponde, i prezzi restano validi.
 */
export async function fetchMarketRows(timeoutMs = 6000): Promise<MarketRow[]> {
  const [pricesHtml, boughtHtml] = await Promise.all([
    fetchPage(PRICES_URL, timeoutMs),
    fetchPage(MOST_BOUGHT_URL, timeoutMs)
  ]);

  if (!pricesHtml) return [];

  const byKey = new Map<string, MarketRow>();
  const keyOf = (r: RawRow) => `${normalizeName(r.surname)}|${normalizeName(r.firstName)}|${r.role}`;

  // Tabella prezzi: Kap. | 8/350 | 10/350 | 8/500 | 10/500 | M.V. | Pres.
  for (const row of parseRows(pricesHtml)) {
    const quote: MarketQuote = {
      p8b350: parseNumber(row.cells[1] || ''),
      p10b350: parseNumber(row.cells[2] || ''),
      p8b500: parseNumber(row.cells[3] || ''),
      p10b500: parseNumber(row.cells[4] || ''),
      mv: parseNumber(row.cells[5] || ''),
      presences: parseNumber(row.cells[6] || '')
    };
    if (!quote.p8b350 && !quote.p10b350 && !quote.p8b500 && !quote.p10b500) continue;
    byKey.set(keyOf(row), {
      role: row.role,
      team: row.team,
      surname: row.surname,
      firstName: row.firstName,
      quote
    });
  }

  // Tabella più comprati: Kap. | Comprato da % | Prezzo 350 | Prezzo 500 | Titolare | 7 gg
  if (boughtHtml) {
    for (const row of parseRows(boughtHtml)) {
      const ownership = parseNumber((row.cells[1] || '').replace(/%/g, ''));
      const trend7d = parseNumber(row.cells[5] || '');
      if (ownership === undefined && trend7d === undefined) continue;
      const key = keyOf(row);
      const existing = byKey.get(key);
      if (existing) {
        if (ownership !== undefined) existing.quote.ownership = ownership;
        if (trend7d !== undefined) existing.quote.trend7d = trend7d;
      } else {
        byKey.set(key, {
          role: row.role,
          team: row.team,
          surname: row.surname,
          firstName: row.firstName,
          quote: {
            ownership,
            trend7d,
            p8b350: parseNumber(row.cells[2] || ''),
            p8b500: parseNumber(row.cells[3] || '')
          }
        });
      }
    }
  }

  return Array.from(byKey.values());
}

/**
 * Aggancia le righe di mercato ai giocatori del listone ufficiale.
 * Il listino scrive "Rossi A.", il mercato "ROSSI Antonio": si parte dal
 * cognome (anche composto), poi si disambigua con l'iniziale del nome, la
 * squadra e infine il ruolo.
 */
export function attachMarketData(players: Player[], rows: MarketRow[]): number {
  if (rows.length === 0) return 0;

  const bySurname = new Map<string, MarketRow[]>();
  for (const row of rows) {
    const key = normalizeName(row.surname);
    const list = bySurname.get(key);
    if (list) list.push(row);
    else bySurname.set(key, [row]);
  }

  let matched = 0;

  for (const player of players) {
    const tokens = decodeEntities(player.name).trim().split(/\s+/);
    let found: MarketRow | null = null;

    // Cognomi composti: si prova prima con più token, poi si accorcia
    for (let k = tokens.length; k >= 1 && !found; k--) {
      const surnameKey = normalizeName(tokens.slice(0, k).join(''));
      const candidates = bySurname.get(surnameKey);
      if (!candidates || candidates.length === 0) continue;

      let pool = candidates;
      const rest = normalizeName(tokens.slice(k).join(''));
      if (rest) {
        const byFullFirstName = pool.filter(c => normalizeName(c.firstName).startsWith(rest));
        pool = byFullFirstName.length
          ? byFullFirstName
          : pool.filter(c => normalizeName(c.firstName).charAt(0) === rest.charAt(0));
      }
      if (pool.length > 1) {
        const sameTeam = pool.filter(c => normalizeName(c.team) === normalizeName(player.team));
        if (sameTeam.length) pool = sameTeam;
      }
      if (pool.length > 1) {
        const sameRole = pool.filter(c => c.role === player.role);
        if (sameRole.length) pool = sameRole;
      }
      if (pool.length === 1) found = pool[0];
    }

    if (found) {
      player.market = found.quote;
      matched++;
    }
  }

  return matched;
}
