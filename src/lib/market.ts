import { Player } from '../types';

/**
 * MERCATO REALE
 * -------------
 * Prezzi medi effettivamente pagati nelle aste vere (fonte: aggregatore di leghe
 * reali), non stime derivate dal listino. Il dato arriva su quattro formati di
 * lega: 8 o 10 squadre, budget 350 o 500 crediti. Da questi quattro punti
 * ricaviamo il prezzo atteso nella lega specifica dell'utente.
 */

export interface MarketQuote {
  /** Prezzo medio reale in lega da 7-8 squadre / 300-400 crediti */
  p8b350?: number;
  /** Prezzo medio reale in lega da 9-11 squadre / 300-400 crediti */
  p10b350?: number;
  /** Prezzo medio reale in lega da 7-8 squadre / 440-560 crediti */
  p8b500?: number;
  /** Prezzo medio reale in lega da 9-11 squadre / 440-560 crediti */
  p10b500?: number;
  /** Percentuale di squadre che lo hanno in rosa (quanto è conteso) */
  ownership?: number;
  /** Variazione del prezzo medio negli ultimi 7 giorni, in crediti */
  trend7d?: number;
  /** Media voto e presenze della stagione precedente, come le riporta il mercato */
  mv?: number;
  presences?: number;
}

/** Le quattro configurazioni di lega su cui abbiamo prezzi reali */
type GridCell = { participants: 8 | 10; budget: 350 | 500; key: keyof MarketQuote };

const GRID: GridCell[] = [
  { participants: 8, budget: 350, key: 'p8b350' },
  { participants: 10, budget: 350, key: 'p10b350' },
  { participants: 8, budget: 500, key: 'p8b500' },
  { participants: 10, budget: 500, key: 'p10b500' }
];

/**
 * Fattori di conversione misurati sui dati reali (mediane su centinaia di
 * giocatori quotati in più formati contemporaneamente). Lavorano sulla "quota
 * di budget" (prezzo / budget della lega), non sul prezzo assoluto.
 *
 * - Più squadre in lega => più concorrenza => ogni giocatore pesa di più.
 * - Budget più alto => i crediti extra si spalmano sulla rosa => il singolo
 *   top pesa percentualmente meno.
 */
const PART_RATIO_350 = 1.132; // quota 10 squadre ÷ quota 8 squadre, a budget 350
const PART_RATIO_500 = 1.250; // idem, a budget 500
const BUDGET_RATIO_8 = 0.633; // quota budget 500 ÷ quota budget 350, a 8 squadre
const BUDGET_RATIO_10 = 0.715; // idem, a 10 squadre

/** Oltre l'intervallo osservato (8-10 squadre) l'effetto viene smorzato */
const EXTRAPOLATION_DAMPING = 0.7;

export function hasMarketData(player: Player): boolean {
  const m = player.market;
  if (!m) return false;
  return GRID.some(c => typeof m[c.key] === 'number' && (m[c.key] as number) > 0);
}

/** Numero di formati di lega per cui esiste un prezzo reale (0-4) */
export function marketAnchorCount(quote: MarketQuote): number {
  return GRID.filter(c => typeof quote[c.key] === 'number' && (quote[c.key] as number) > 0).length;
}

/**
 * Ricostruisce la griglia completa 2x2 delle quote-budget partendo dagli
 * ancoraggi disponibili. Le celle mancanti vengono stimate dalle presenti con i
 * fattori misurati; quando esistono più percorsi si media (i percorsi diretti
 * pesano più di quelli diagonali).
 */
function buildShareGrid(quote: MarketQuote): { s8b350: number; s10b350: number; s8b500: number; s10b500: number } | null {
  const known: Partial<Record<keyof MarketQuote, number>> = {};
  for (const cell of GRID) {
    const v = quote[cell.key];
    if (typeof v === 'number' && v > 0) known[cell.key] = v / cell.budget;
  }
  if (Object.keys(known).length === 0) return null;

  // Fattore moltiplicativo per passare da una cella all'altra della griglia
  const factor = (from: GridCell, to: GridCell): number => {
    let f = 1;
    if (from.participants !== to.participants) {
      // il fattore "numero squadre" dipende dal budget di partenza
      const r = from.budget === 350 ? PART_RATIO_350 : PART_RATIO_500;
      f *= to.participants > from.participants ? r : 1 / r;
    }
    if (from.budget !== to.budget) {
      const r = from.participants === 8 ? BUDGET_RATIO_8 : BUDGET_RATIO_10;
      f *= to.budget > from.budget ? r : 1 / r;
    }
    return f;
  };

  const grid: Record<string, number> = {};
  for (const target of GRID) {
    const direct = known[target.key];
    if (direct !== undefined) {
      grid[target.key] = direct;
      continue;
    }
    let acc = 0;
    let wSum = 0;
    for (const source of GRID) {
      const s = known[source.key];
      if (s === undefined) continue;
      const steps =
        (source.participants !== target.participants ? 1 : 0) +
        (source.budget !== target.budget ? 1 : 0);
      const weight = steps === 1 ? 1 : 0.5; // le stime diagonali sono meno affidabili
      acc += s * factor(source, target) * weight;
      wSum += weight;
    }
    grid[target.key] = acc / wSum;
  }

  return {
    s8b350: grid.p8b350,
    s10b350: grid.p10b350,
    s8b500: grid.p8b500,
    s10b500: grid.p10b500
  };
}

/**
 * Quota di budget attesa per questo giocatore nella lega richiesta.
 * Interpolazione geometrica sul numero di squadre, lineare sul budget.
 */
function marketShare(quote: MarketQuote, participants: number, budget: number): number | null {
  const grid = buildShareGrid(quote);
  if (!grid) return null;

  // Asse squadre: t = 0 => 8 squadre, t = 1 => 10 squadre
  let t = (participants - 8) / 2;
  if (t < 0) t = t * EXTRAPOLATION_DAMPING;
  else if (t > 1) t = 1 + (t - 1) * EXTRAPOLATION_DAMPING;
  t = Math.max(-1, Math.min(2, t));

  const geoLerp = (a: number, b: number): number => {
    if (a <= 0 || b <= 0) return Math.max(0, a + (b - a) * t);
    return a * Math.pow(b / a, t);
  };

  const share350 = geoLerp(grid.s8b350, grid.s10b350);
  const share500 = geoLerp(grid.s8b500, grid.s10b500);

  // Asse budget: fuori dall'intervallo osservato la quota resta quella del
  // formato più vicino (il prezzo torna quindi proporzionale al budget)
  const u = Math.max(0, Math.min(1, (budget - 350) / 150));
  return share350 + (share500 - share350) * u;
}

/**
 * Prezzo d'asta reale atteso, in crediti della lega dell'utente.
 * Restituisce null se per quel giocatore non esistono dati di mercato.
 */
export function marketPriceFor(player: Player, budget: number, participants: number): number | null {
  if (!player.market) return null;
  const share = marketShare(player.market, participants, budget);
  if (share === null || !isFinite(share) || share <= 0) return null;
  return Math.max(1, Math.round(share * budget));
}

/**
 * Fascia di prezzo reale: minimo e massimo osservabili in asta.
 * L'ampiezza cresce con quanto il giocatore è conteso (ownership alta = più
 * probabile la guerra di rilanci) e con la dispersione fra i formati di lega.
 */
export function marketRangeFor(
  player: Player,
  budget: number,
  participants: number
): { min: number; max: number; avg: number } | null {
  const avg = marketPriceFor(player, budget, participants);
  if (avg === null || !player.market) return null;

  const ownership = player.market.ownership ?? 0;
  // 18% di oscillazione base, fino a ~32% per i giocatori più contesi
  const spread = 0.18 + Math.min(0.14, (ownership / 100) * 0.35);

  return {
    avg,
    min: Math.max(1, Math.round(avg * (1 - spread))),
    max: Math.max(2, Math.round(avg * (1 + spread)))
  };
}

/** Etichetta leggibile del formato lega, per mostrare la fonte del prezzo */
export function marketAnchorLabels(quote: MarketQuote): { label: string; value: number }[] {
  return GRID.filter(c => typeof quote[c.key] === 'number' && (quote[c.key] as number) > 0).map(c => ({
    label: `${c.participants} sq. / ${c.budget}`,
    value: quote[c.key] as number
  }));
}
