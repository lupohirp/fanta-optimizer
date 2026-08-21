import { Player, Role, LeagueSettings, GeneratedSquad } from '../types';
import { calculateDynamicPrice, MarketValuation } from './optimizer';

/**
 * CONSENSO DI MERCATO
 * -------------------
 * I tool di consiglio girano tutti sugli stessi dati pubblici: chi li usa
 * converge sugli stessi nomi. Quella convergenza qui è misurabile, perché
 * sappiamo in che percentuale di rose ogni giocatore è già finito nelle aste
 * completate.
 *
 * Da questo si ricavano due cose utili all'asta: quali dei tuoi obiettivi
 * scateneranno una guerra di rilanci, e quali giocatori rendono quanto loro
 * senza che nessuno se li fili.
 */

/** Sopra questa diffusione un giocatore è conteso: aspettati concorrenza vera */
export const CONTESTED_THRESHOLD = 15;

/** Un'alternativa è "poco battuta" se la cercano molto meno del giocatore conteso */
const LOW_PROFILE_RATIO = 0.4;

/** Quanto peggio può essere un'alternativa in classifica di ruolo prima di non valere */
const MAX_RANK_GAP = 12;

export interface ConsensusAlternative {
  player: Player;
  ownership: number;
  price: number;
  /** Crediti risparmiati rispetto al giocatore conteso */
  saves: number;
  /** Posizioni perse (positivo) o guadagnate (negativo) nella classifica di ruolo */
  rankGap: number;
}

export interface ContestedPick {
  player: Player;
  ownership: number;
  price: number;
  alternatives: ConsensusAlternative[];
}

export interface ConsensusReport {
  /** Giocatori della rosa che hanno il dato di diffusione */
  covered: number;
  /** Quanti tuoi acquisti sono sopra la soglia di contesa */
  contestedCount: number;
  /** Crediti impegnati su quegli acquisti */
  contestedSpend: number;
  /** Diffusione media dei tuoi giocatori, pesata sulla spesa */
  weightedOwnership: number;
  /** Quanti dei tuoi 25 sono anche fra i più comprati del proprio ruolo */
  overlapWithMostBought: number;
  /** Gli acquisti contesi, dal più conteso */
  contested: ContestedPick[];
}

function ownershipOf(player: Player): number | null {
  const o = player.market?.ownership;
  return typeof o === 'number' ? o : null;
}

/**
 * I giocatori più comprati di ogni ruolo, tanti quanti gli slot della lega:
 * è la rosa verso cui converge chi segue i consigli standard.
 */
export function mostBoughtIds(allPlayers: Player[], settings: LeagueSettings): Set<string> {
  const ids = new Set<string>();
  (['P', 'D', 'C', 'A'] as Role[]).forEach(role => {
    allPlayers
      .filter(p => p.role === role && ownershipOf(p) !== null)
      .sort((a, b) => (ownershipOf(b) || 0) - (ownershipOf(a) || 0))
      .slice(0, settings.slots[role])
      .forEach(p => ids.add(p.id));
  });
  return ids;
}

/**
 * Alternative che rendono quanto un giocatore conteso ma che quasi nessuno
 * sta comprando. Si richiede: stesso ruolo, diffusione molto più bassa, prezzo
 * non superiore e qualità comparabile secondo la classifica di ruolo.
 */
export function findLowProfileAlternatives(
  player: Player,
  allPlayers: Player[],
  settings: LeagueSettings,
  valuations: Map<string, MarketValuation>,
  excludeIds: string[] = [],
  limit = 3
): ConsensusAlternative[] {
  const mine = valuations.get(player.id);
  const myOwnership = ownershipOf(player);
  if (!mine || myOwnership === null) return [];

  const ownershipCeiling = Math.max(3, myOwnership * LOW_PROFILE_RATIO);
  const excluded = new Set(excludeIds);

  return allPlayers
    .filter(p => {
      if (p.role !== player.role || p.id === player.id || excluded.has(p.id)) return false;
      const own = ownershipOf(p);
      if (own === null || own > ownershipCeiling) return false;
      const v = valuations.get(p.id);
      if (!v) return false;
      if (v.price > mine.price) return false;
      return v.valueRank - mine.valueRank <= MAX_RANK_GAP;
    })
    .map(p => {
      const v = valuations.get(p.id) as MarketValuation;
      return {
        player: p,
        ownership: ownershipOf(p) as number,
        price: v.price,
        saves: mine.price - v.price,
        rankGap: v.valueRank - mine.valueRank
      };
    })
    .sort((a, b) => a.rankGap - b.rankGap)
    .slice(0, limit);
}

/**
 * Fotografia di quanto una rosa somiglia a quella verso cui convergono tutti.
 */
export function analyzeConsensus(
  squad: GeneratedSquad,
  allPlayers: Player[],
  settings: LeagueSettings,
  valuations: Map<string, MarketValuation>
): ConsensusReport {
  const squadIds = squad.players.map(p => p.id);
  const mostBought = mostBoughtIds(allPlayers, settings);

  let covered = 0;
  let spendTotal = 0;
  let ownershipWeighted = 0;
  const contested: ContestedPick[] = [];

  for (const player of squad.players) {
    const own = ownershipOf(player);
    if (own === null) continue;
    covered++;

    const price = calculateDynamicPrice(player, settings.totalBudget, settings.participants);
    spendTotal += price;
    ownershipWeighted += own * price;

    if (own >= CONTESTED_THRESHOLD) {
      contested.push({ player, ownership: own, price, alternatives: [] });
    }
  }

  contested.sort((a, b) => b.ownership - a.ownership);

  // Le alternative si calcolano dal più conteso in giù, senza mai riproporre
  // un nome già suggerito: sono piani B da eseguire tutti insieme, non in
  // alternativa fra loro
  const alreadySuggested = [...squadIds];
  for (const pick of contested) {
    pick.alternatives = findLowProfileAlternatives(
      pick.player,
      allPlayers,
      settings,
      valuations,
      alreadySuggested
    );
    pick.alternatives.forEach(a => alreadySuggested.push(a.player.id));
  }

  return {
    covered,
    contestedCount: contested.length,
    contestedSpend: contested.reduce((s, c) => s + c.price, 0),
    weightedOwnership: spendTotal > 0 ? ownershipWeighted / spendTotal : 0,
    overlapWithMostBought: squad.players.filter(p => mostBought.has(p.id)).length,
    contested
  };
}
