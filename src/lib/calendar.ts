import { Player, Role } from '../types';
import calendarJson from '../data/calendar_2026_27.json';

/**
 * CALENDARIO
 * ----------
 * Il calendario completo della Serie A, con una misura di quanto è difficile
 * ogni impegno. La forza delle squadre non è messa a mano: si deduce da quanto
 * il mercato paga i loro giocatori, che è il giudizio collettivo di migliaia di
 * aste sulla qualità di quella rosa. Attacco e difesa vengono pesati separati,
 * perché a un portiere interessa quanto segna l'avversario e a un attaccante
 * quanto lo stesso avversario subisce.
 */

interface CalendarRound {
  round: number;
  start: string;
  end: string;
  matches: string[][];
}

const CALENDAR = calendarJson as { season: string; teams: string[]; rounds: CalendarRound[] };

export const TOTAL_ROUNDS = CALENDAR.rounds.length;

/** Quanti giocatori per reparto entrano nel calcolo della forza di una squadra */
const STRENGTH_SAMPLE = 5;

/** Vantaggio del fattore campo, sulla scala 0-1 della forza avversaria */
const HOME_ADVANTAGE = 0.08;

export interface TeamStrength {
  /** Quanto fa male in avanti, da 0 (nessuna minaccia) a 1 (il migliore del campionato) */
  attack: number;
  /** Quanto è solida dietro, da 0 (si passa facile) a 1 (muro) */
  defense: number;
}

export interface Fixture {
  round: number;
  opponent: string;
  home: boolean;
  start: string;
  /** Da 1 (impegno agevole) a 5 (proibitivo) per il ruolo considerato */
  difficulty: number;
}

/**
 * La giornata che si sta per giocare: la prima che non è ancora finita.
 * Prima dell'inizio del campionato è la 1, a stagione conclusa resta l'ultima.
 */
export function currentRound(today: Date = new Date()): number {
  const iso = today.toISOString().slice(0, 10);
  const next = CALENDAR.rounds.find(r => r.end >= iso);
  return next ? next.round : TOTAL_ROUNDS;
}

export function roundDate(round: number): string | null {
  return CALENDAR.rounds.find(r => r.round === round)?.start ?? null;
}

/**
 * Forza di ogni squadra ricavata dal valore d'asta dei suoi giocatori migliori,
 * normalizzata sul campionato: 0 è la più debole, 1 la più forte.
 */
export function computeTeamStrengths(players: Player[]): Record<string, TeamStrength> {
  const topSum = (pool: Player[]) =>
    pool
      .map(p => p.estimatedPrice500 || 0)
      .sort((a, b) => b - a)
      .slice(0, STRENGTH_SAMPLE)
      .reduce((s, v) => s + v, 0);

  const raw = CALENDAR.teams.map(team => {
    const squad = players.filter(p => p.team === team);
    return {
      team,
      attack: topSum(squad.filter(p => p.role === 'C' || p.role === 'A')),
      defense: topSum(squad.filter(p => p.role === 'P' || p.role === 'D'))
    };
  });

  const scale = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    return (v: number) => (span > 0 ? (v - min) / span : 0.5);
  };

  const scaleAttack = scale(raw.map(r => r.attack));
  const scaleDefense = scale(raw.map(r => r.defense));

  const result: Record<string, TeamStrength> = {};
  raw.forEach(r => {
    result[r.team] = { attack: scaleAttack(r.attack), defense: scaleDefense(r.defense) };
  });
  return result;
}

/** Difficoltà 1-5 di affrontare `opponent` per un giocatore di quel ruolo */
export function fixtureDifficulty(
  role: Role,
  opponent: string,
  home: boolean,
  strengths: Record<string, TeamStrength>
): number {
  const opp = strengths[opponent];
  if (!opp) return 3;
  // Portieri e difensori temono chi segna; centrocampisti e attaccanti chi non subisce
  const relevant = role === 'P' || role === 'D' ? opp.attack : opp.defense;
  const adjusted = relevant + (home ? -HOME_ADVANTAGE : HOME_ADVANTAGE);
  return 1 + Math.round(Math.max(0, Math.min(1, adjusted)) * 4);
}

/** I prossimi impegni di una squadra, con la difficoltà vista da quel ruolo */
export function upcomingFixtures(
  team: string,
  role: Role,
  strengths: Record<string, TeamStrength>,
  fromRound: number = currentRound(),
  count: number = 5
): Fixture[] {
  const out: Fixture[] = [];
  for (const round of CALENDAR.rounds) {
    if (round.round < fromRound || out.length >= count) continue;
    for (const [home, away] of round.matches) {
      if (home !== team && away !== team) continue;
      const isHome = home === team;
      const opponent = isHome ? away : home;
      out.push({
        round: round.round,
        opponent,
        home: isHome,
        start: round.start,
        difficulty: fixtureDifficulty(role, opponent, isHome, strengths)
      });
    }
  }
  return out;
}

/** Media di difficoltà su una serie di impegni, con etichetta leggibile */
export function calendarVerdict(fixtures: Fixture[]): { avg: number; label: string } {
  if (fixtures.length === 0) return { avg: 3, label: 'calendario neutro' };
  const avg = fixtures.reduce((s, f) => s + f.difficulty, 0) / fixtures.length;
  const label =
    avg <= 2.2 ? 'avvio morbido' :
    avg <= 2.8 ? 'avvio favorevole' :
    avg <= 3.3 ? 'avvio nella media' :
    avg <= 3.8 ? 'avvio impegnativo' : 'avvio proibitivo';
  return { avg, label };
}

/** Un impegno si considera agevole da questa difficoltà in giù */
export const EASY_FIXTURE = 2;

/**
 * Quanto due giocatori si coprono a vicenda: la percentuale di giornate in cui
 * almeno uno dei due ha un impegno agevole. È il senso di una coppia da
 * alternare: quando uno ha la partitaccia, l'altro gioca contro chi ti fa
 * comodo. Due giocatori della stessa squadra hanno per forza copertura piatta.
 */
export function comboCoverage(a: Fixture[], b: Fixture[]): number {
  const rounds = new Set([...a.map(f => f.round), ...b.map(f => f.round)]);
  if (rounds.size === 0) return 0;
  let covered = 0;
  rounds.forEach(r => {
    const fa = a.find(f => f.round === r);
    const fb = b.find(f => f.round === r);
    if ((fa && fa.difficulty <= EASY_FIXTURE) || (fb && fb.difficulty <= EASY_FIXTURE)) covered++;
  });
  return Math.round((covered / rounds.size) * 100);
}

export interface ComboSuggestion {
  partner: Player;
  coverage: number;
  /** Copertura del solo giocatore di partenza, per capire quanto migliora */
  soloCoverage: number;
}

/**
 * Fra i candidati, chi completa meglio il calendario di questo giocatore.
 * Si scartano i compagni di squadra: hanno lo stesso calendario, non coprono
 * niente.
 */
export function bestComboPartners(
  player: Player,
  candidates: Player[],
  strengths: Record<string, TeamStrength>,
  fromRound: number = currentRound(),
  count: number = 6,
  limit: number = 3
): ComboSuggestion[] {
  const mine = upcomingFixtures(player.team, player.role, strengths, fromRound, count);
  if (mine.length === 0) return [];
  const solo = comboCoverage(mine, []);

  return candidates
    .filter(c => c.id !== player.id && c.team !== player.team && c.role === player.role)
    .map(partner => ({
      partner,
      coverage: comboCoverage(mine, upcomingFixtures(partner.team, partner.role, strengths, fromRound, count)),
      soloCoverage: solo
    }))
    .filter(s => s.coverage > solo)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, limit);
}

export interface RoleCoverage {
  /** Giornate in cui almeno un giocatore del reparto ha un impegno agevole */
  covered: number[];
  /** Giornate in cui nessuno ce l'ha: lì il reparto va in apnea */
  uncovered: number[];
  /** Percentuale di giornate coperte */
  pct: number;
}

/**
 * Quante giornate il reparto riesce a coprire con almeno una partita agevole.
 * È la versione di squadra dell'idea di combo: non conta che un singolo
 * giocatore abbia un buon calendario, conta non restare mai senza nessuno.
 */
export function roleCoverage(
  players: Player[],
  strengths: Record<string, TeamStrength>,
  fromRound: number = currentRound(),
  count: number = 6
): RoleCoverage {
  const covered: number[] = [];
  const uncovered: number[] = [];

  const perPlayer = players.map(p => upcomingFixtures(p.team, p.role, strengths, fromRound, count));

  for (let i = 0; i < count; i++) {
    const round = fromRound + i;
    if (round > TOTAL_ROUNDS) break;
    const easy = perPlayer.some(fixtures =>
      fixtures.some(f => f.round === round && f.difficulty <= EASY_FIXTURE)
    );
    (easy ? covered : uncovered).push(round);
  }

  const total = covered.length + uncovered.length;
  return { covered, uncovered, pct: total > 0 ? Math.round((covered.length / total) * 100) : 0 };
}

export interface GapFiller {
  player: Player;
  /** Quante delle giornate scoperte questo giocatore renderebbe agevoli */
  fills: number;
  rounds: number[];
}

/**
 * Chi, fra i giocatori disponibili, copre più giornate rimaste scoperte.
 * Serve in asta: se il tuo attacco è in apnea alla terza e alla quinta, questo
 * dice chi comprare per non restarci.
 */
export function bestGapFillers(
  uncoveredRounds: number[],
  candidates: Player[],
  strengths: Record<string, TeamStrength>,
  fromRound: number = currentRound(),
  count: number = 6,
  limit: number = 3
): GapFiller[] {
  if (uncoveredRounds.length === 0) return [];
  const target = new Set(uncoveredRounds);

  return candidates
    .map(player => {
      const rounds = upcomingFixtures(player.team, player.role, strengths, fromRound, count)
        .filter(f => target.has(f.round) && f.difficulty <= EASY_FIXTURE)
        .map(f => f.round);
      return { player, fills: rounds.length, rounds };
    })
    .filter(g => g.fills > 0)
    .sort((a, b) => b.fills - a.fills || (a.player.estimatedPrice500 || 0) - (b.player.estimatedPrice500 || 0))
    .slice(0, limit);
}
