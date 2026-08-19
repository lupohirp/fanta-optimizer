import {
  Player,
  Role,
  LeagueSettings,
  GeneratedSquad
} from '../types';
import { STRATEGIES } from '../data/players';

/**
 * Calcola il prezzo d'asta stimato scalato sul budget dell'utente e sui partecipanti
 */
export function calculateDynamicPrice(
  player: Player,
  totalBudget: number,
  participants: number = 8
): number {
  const baseBudget = 500;
  const budgetRatio = totalBudget / baseBudget;

  // Fattore di scarsità basato sul numero di squadre nella lega
  const scarcityFactor = participants >= 12 ? 1.25 : participants >= 10 ? 1.12 : participants === 6 ? 0.88 : 1.0;

  // Se l'utente ha impostato un valore custom personalizzato, usalo esattamente
  if (player.isCustomPrice && (player.estimatedPrice500 !== undefined || player.avgAuctionPrice500 !== undefined)) {
    const custom500 = player.estimatedPrice500 ?? player.avgAuctionPrice500 ?? 1;
    return Math.max(1, Math.round(custom500 * budgetRatio));
  }

  // Prezzo base sul listino a 500
  let price500 = player.estimatedPrice500 || player.quotation || 1;

  // I top player (tier 1 e 2) subiscono una crescita con la scarsità
  if (player.tier === 1) {
    price500 = price500 * (1 + (scarcityFactor - 1) * 1.4);
  } else if (player.tier === 2) {
    price500 = price500 * (1 + (scarcityFactor - 1) * 1.1);
  } else if (player.tier === 5) {
    return Math.max(1, Math.round(budgetRatio));
  }

  const calculated = Math.round(price500 * budgetRatio);
  return Math.max(1, calculated);
}

/**
 * Calcola il range medio reale d'asta (Prezzo Medio, Minimo e Massimo registrato)
 */
export function getPlayerAuctionRange(
  player: Player,
  totalBudget: number,
  participants: number = 8
): { avg: number; min: number; max: number; budgetPercentage: number } {
  const avg = calculateDynamicPrice(player, totalBudget, participants);
  const budgetPercentage = parseFloat(((avg / totalBudget) * 100).toFixed(1));

  const volatility = player.tier === 1 ? 0.18 : player.tier === 2 ? 0.25 : player.tier === 3 ? 0.35 : 0.45;
  const min = Math.max(1, Math.round(avg * (1 - volatility)));
  const max = Math.max(min + 1, Math.round(avg * (1 + volatility)));

  return { avg, min, max, budgetPercentage };
}

/**
 * Pesi percentuali di budget per reparto in base alla strategia
 */
export function getStrategyWeights(settings: LeagueSettings): { P: number; D: number; C: number; A: number } {
  const strat = STRATEGIES[settings.strategy] || STRATEGIES.balanced;
  const weights = { ...strat.budgetWeights };

  // Se il modificatore di difesa è attivo, potenzia la difesa
  if (settings.defenseModifier && settings.strategy !== 'defense_modifier') {
    weights.D += 0.05;
    weights.A -= 0.03;
    weights.C -= 0.02;
  }

  if (settings.cleanSheetBonus) {
    weights.P += 0.02;
    weights.C -= 0.01;
    weights.D -= 0.01;
  }

  const sum = weights.P + weights.D + weights.C + weights.A;
  return {
    P: weights.P / sum,
    D: weights.D / sum,
    C: weights.C / sum,
    A: weights.A / sum,
  };
}

/**
 * Fiducia nella FM proiettata per fascia di mercato (tier): il prezzo d'asta
 * incorpora un consenso che le proiezioni individuali non hanno. Le FM dei top
 * di mercato sono affidabili; quelle delle fasce basse vanno compresse verso la
 * media di ruolo, altrimenti l'ottimizzatore compra sistematicamente proprio i
 * giocatori con le stime più gonfiate del listone.
 */
const TIER_TRUST: Record<number, number> = { 1: 0.95, 2: 0.72, 3: 0.55, 4: 0.5, 5: 0.45 };

/** FM media dei titolari (titolarità >= 80) per ruolo: baseline della compressione */
function roleBaselines(players: Player[]): Record<Role, number> {
  const res = { P: 5.3, D: 6.0, C: 6.1, A: 6.4 } as Record<Role, number>;
  (['P', 'D', 'C', 'A'] as Role[]).forEach(role => {
    const pool = players.filter(p => p.role === role && p.starterProbability >= 80);
    if (pool.length >= 5) {
      res[role] = pool.reduce((s, p) => s + p.expectedPoints, 0) / pool.length;
    }
  });
  return res;
}

/** FM "bancabile": compressa verso la baseline in base al tier, con tetto per titolarità incerta */
function reliableFM(player: Player, baseline: number): number {
  const trust = TIER_TRUST[player.tier] ?? 0.55;
  let fm = baseline + (player.expectedPoints - baseline) * trust;
  if (player.starterProbability < 75) {
    fm = Math.min(fm, baseline + 0.8); // upside non bancabile senza posto fisso
  }
  return fm;
}

/**
 * Premio "stella": la FM media comprime il vantaggio reale dei top player
 * (bonus pesanti, code lunghe di rendimento). Sopra la soglia ogni decimale
 * extra vale progressivamente di più, così pagare il prezzo di un campione
 * torna razionale anche per un ottimizzatore lineare nei crediti.
 */
const STAR_FM_FLOOR = 6.8;
const STAR_PREMIUM = 22;

/**
 * Score complessivo di un calciatore: FM affidabile + premio stella,
 * massima priorità alla CERTEZZA DEL VOTO (Titolarità), più l'identità
 * della strategia scelta (ogni preset spinge profili diversi, non solo
 * una diversa ripartizione del budget).
 */
function computePlayerScore(player: Player, settings: LeagueSettings, baselineFM: number): number {
  const fm = reliableFM(player, baselineFM);
  let score = fm * 10 + Math.pow(Math.max(0, fm - STAR_FM_FLOOR), 2) * STAR_PREMIUM;

  // PRIORITÀ MASSIMA: Titolarità & Certezza di voto
  score += (player.starterProbability / 100) * 35;

  if (player.starterProbability >= 85) {
    score += 15; // Bonus Titolare Inamovibile
  } else if (player.starterProbability < 60) {
    score -= 40; // Penalità severa per panchinari a rischio s.v.
  }

  // Bonus rigoristi
  if (player.isPenaltyTaker) {
    score += 14;
  }

  // Bonus piazzati
  if (player.isFreeKickTaker) {
    score += 6;
  }

  // Modificatore di difesa (checkbox di lega o strategia dedicata):
  // premia difensori con media voto pura alta
  if ((settings.defenseModifier || settings.strategy === 'defense_modifier') && player.role === 'D') {
    score += player.expectedPoints >= 6.3 ? 12 : 4;
  }

  // Bonus porta inviolata per i portieri
  if (settings.cleanSheetBonus && player.role === 'P') {
    score += player.tier === 1 ? 15 : 5;
  }

  // Identità di strategia
  switch (settings.strategy) {
    case 'heavy_attack':
      // "1-2 Top assoluti in attacco": i big di mercato valgono di più qui
      if (player.role === 'A' && player.tier === 1) score += 25;
      else if (player.role === 'A' && player.tier === 2) score += 8;
      break;
    case 'midfield_power':
      // Mediana da bonus: incursori, rigoristi e big di reparto
      if (player.role === 'C') {
        if (player.isPenaltyTaker || player.isFreeKickTaker) score += 12;
        if (player.tier <= 2) score += 8;
      }
      break;
    case 'defense_modifier':
      // Il preset promette il top portiere oltre ai difensori da bonus
      if (player.role === 'P' && player.tier === 1) score += 12;
      break;
    case 'hype_young':
      // Scommesse: sottovalutati dal mercato con proiezione sopra la media,
      // meno big blasonati
      if (player.tier >= 3 && player.expectedPoints >= baselineFM + 0.25) score += 16;
      else if (player.tier === 1) score -= 10;
      break;
  }

  return score;
}

/**
 * Penalità (punti score per credito) applicata quando la spesa di un reparto
 * devia dal budget target della strategia: mantiene il senso delle strategie
 * senza impedire all'ottimizzatore di spostare crediti dove rendono di più.
 */
const STRATEGY_ADHERENCE = 0.25;

/**
 * Peso dello score dei giocatori destinati alla panchina: in campo va solo l'11
 * titolare, quindi la profondità vale molto meno della qualità dei titolari
 * (le riserve entrano solo per turnover e infortuni).
 */
const BENCH_WEIGHT = 0.3;

/**
 * Ampiezza della perturbazione casuale degli score quando si genera con un seed:
 * ±4% fa ruotare i giocatori con punteggi quasi pari producendo rose diverse
 * ma sempre vicine all'ottimo. Senza seed la generazione è deterministica.
 */
const SCORE_JITTER = 0.04;

/** PRNG deterministico (mulberry32): stesso seed → stessa rosa */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Massimo numero di giocatori di movimento della stessa squadra (diversificazione rischio) */
const MAX_PER_TEAM = 3;

const FORMATIONS: Record<string, { D: number; C: number; A: number }> = {
  '3-4-3': { D: 3, C: 4, A: 3 },
  '4-3-3': { D: 4, C: 3, A: 3 },
  '3-5-2': { D: 3, C: 5, A: 2 },
  '4-4-2': { D: 4, C: 4, A: 2 },
  '4-2-3-1': { D: 4, C: 5, A: 1 },
};

/**
 * Moduli ammessi: con modulo esplicito solo quello; con 'auto' tutti,
 * MA se il modificatore difesa è attivo solo i moduli a 4+ difensori,
 * perché il modificatore scatta soltanto schierandone almeno 4 e il suo
 * bonus non è visibile nella semplice somma dei punti attesi dell'XI.
 */
function allowedFormations(settings: LeagueSettings): string[] {
  if (settings.targetFormation !== 'auto') return [settings.targetFormation];
  const names = Object.keys(FORMATIONS);
  return settings.defenseModifier ? names.filter(n => FORMATIONS[n].D >= 4) : names;
}

interface Candidate {
  player: Player;
  price: number;     // prezzo in unità DP (>= 1)
  realPrice: number; // prezzo in crediti reali
  score: number;
}

interface RoleSolution {
  /** bestAt[w] = score massimo scegliendo esattamente starters+bench giocatori con spesa ESATTA w (in unità) */
  bestAt: Float64Array;
  /** Ricostruisce la selezione ottima per una spesa esatta w */
  pick: (cost: number) => Candidate[];
}

/**
 * Zaino 0/1 con doppia cardinalità esatta: ogni giocatore può essere preso come
 * titolare (score pieno) o come riserva (score * BENCH_WEIGHT). Trova la
 * combinazione ottima per ogni possibile spesa. Ottimo garantito rispetto allo score.
 */
function solveRoleKnapsack(cands: Candidate[], starters: number, bench: number, maxCost: number): RoleSolution {
  const cols = maxCost + 1;
  const bRows = bench + 1;
  const rows = (starters + 1) * bRows;
  const dp = new Float64Array(rows * cols).fill(Number.NEGATIVE_INFINITY);
  dp[0] = 0;
  // take[i][s][b][w]: 1 = preso da titolare, 2 = preso da riserva (per la ricostruzione)
  const take = new Uint8Array(cands.length * rows * cols);

  for (let i = 0; i < cands.length; i++) {
    const c = cands[i].price;
    const vStarter = cands[i].score;
    const vBench = cands[i].score * BENCH_WEIGHT;
    const base = i * rows * cols;
    for (let s = starters; s >= 0; s--) {
      for (let b = bench; b >= 0; b--) {
        if (s === 0 && b === 0) continue;
        const cur = (s * bRows + b) * cols;
        const fromStarter = s > 0 ? ((s - 1) * bRows + b) * cols : -1;
        const fromBench = b > 0 ? (s * bRows + (b - 1)) * cols : -1;
        for (let w = maxCost; w >= c; w--) {
          const idx = cur + w;
          if (fromStarter >= 0) {
            const from = dp[fromStarter + w - c];
            if (from !== Number.NEGATIVE_INFINITY && from + vStarter > dp[idx]) {
              dp[idx] = from + vStarter;
              take[base + idx] = 1;
            }
          }
          if (fromBench >= 0) {
            const from = dp[fromBench + w - c];
            if (from !== Number.NEGATIVE_INFINITY && from + vBench > dp[idx]) {
              dp[idx] = from + vBench;
              take[base + idx] = 2;
            }
          }
        }
      }
    }
  }

  const full = (starters * bRows + bench) * cols;
  const bestAt = dp.slice(full, full + cols);

  const pick = (cost: number): Candidate[] => {
    const chosen: Candidate[] = [];
    let s = starters;
    let b = bench;
    let w = cost;
    for (let i = cands.length - 1; i >= 0 && (s > 0 || b > 0); i--) {
      const t = take[i * rows * cols + (s * bRows + b) * cols + w];
      if (t === 1) {
        chosen.push(cands[i]);
        w -= cands[i].price;
        s--;
      } else if (t === 2) {
        chosen.push(cands[i]);
        w -= cands[i].price;
        b--;
      }
    }
    return chosen;
  };

  return { bestAt, pick };
}

/**
 * Ripartisce il budget totale tra i reparti: per ogni possibile spesa complessiva
 * sceglie la combinazione di spese per reparto che massimizza lo score totale,
 * penalizzando le deviazioni dai target della strategia.
 */
function combineRoles(
  roleData: Array<{ bestAt: Float64Array; target: number }>,
  totalCost: number,
  lambda: number
): number[] | null {
  let acc = new Float64Array(totalCost + 1).fill(Number.NEGATIVE_INFINITY);
  acc[0] = 0;
  const parents: Int32Array[] = [];

  for (const { bestAt, target } of roleData) {
    const next = new Float64Array(totalCost + 1).fill(Number.NEGATIVE_INFINITY);
    const parent = new Int32Array(totalCost + 1).fill(-1);
    for (let b = 0; b <= totalCost; b++) {
      const sMax = Math.min(b, bestAt.length - 1);
      for (let s = 0; s <= sMax; s++) {
        const own = bestAt[s];
        const before = acc[b - s];
        if (own === Number.NEGATIVE_INFINITY || before === Number.NEGATIVE_INFINITY) continue;
        const val = before + own - lambda * Math.abs(s - target);
        if (val > next[b]) {
          next[b] = val;
          parent[b] = s;
        }
      }
    }
    parents.push(parent);
    acc = next;
  }

  let bestB = -1;
  let bestVal = Number.NEGATIVE_INFINITY;
  for (let b = 0; b <= totalCost; b++) {
    if (acc[b] > bestVal) {
      bestVal = acc[b];
      bestB = b;
    }
  }
  if (bestB < 0) return null;

  const costs: number[] = new Array(roleData.length).fill(0);
  let b = bestB;
  for (let r = roleData.length - 1; r >= 0; r--) {
    const s = parents[r][b];
    if (s < 0) return null;
    costs[r] = s;
    b -= s;
  }
  return costs;
}

/**
 * Limita i candidati per la DP: i migliori per score più i più economici
 * (i riempitivi da 1 credito servono a garantire la fattibilità del vincolo di rosa)
 */
function pruneCandidates(cands: Candidate[], maxMain = 150, maxCheap = 40): Candidate[] {
  if (cands.length <= maxMain) return cands;
  const byScore = [...cands].sort((a, b) => b.score - a.score);
  const kept = new Set(byScore.slice(0, maxMain).map(c => c.player.id));
  byScore
    .filter(c => c.price <= 3)
    .slice(0, maxCheap)
    .forEach(c => kept.add(c.player.id));
  return cands.filter(c => kept.has(c.player.id));
}

/**
 * Motore principale di generazione ed ottimizzazione rosa.
 * Portieri: blocco della stessa squadra (euristica di dominio).
 * D/C/A: zaino esatto per reparto + ripartizione ottima del budget tra reparti.
 */
export function optimizeSquad(
  allPlayers: Player[],
  settings: LeagueSettings,
  pinnedIds: string[] = [],
  blacklistedIds: string[] = [],
  seed?: number
): GeneratedSquad {
  const weights = getStrategyWeights(settings);
  const totalBudget = settings.totalBudget;
  const participants = settings.participants;

  // Prezzi e score memoizzati: vengono riletti decine di volte per giocatore
  const priceCache = new Map<string, number>();
  const priceFor = (p: Player): number => {
    let v = priceCache.get(p.id);
    if (v === undefined) {
      v = calculateDynamicPrice(p, totalBudget, participants);
      priceCache.set(p.id, v);
    }
    return v;
  };
  const rand = seed !== undefined ? mulberry32(seed) : null;
  const baselines = roleBaselines(allPlayers);
  const scoreCache = new Map<string, number>();
  const scoreFor = (p: Player): number => {
    let v = scoreCache.get(p.id);
    if (v === undefined) {
      v = computePlayerScore(p, settings, baselines[p.role]);
      if (rand) {
        v *= 1 + (rand() - 0.5) * 2 * SCORE_JITTER;
      }
      scoreCache.set(p.id, v);
    }
    return v;
  };

  const availablePlayers = allPlayers.filter(p => !blacklistedIds.includes(p.id));
  const usedIds = new Set<string>();

  const pinnedPlayers = availablePlayers.filter(p => pinnedIds.includes(p.id));
  pinnedPlayers.forEach(p => usedIds.add(p.id));

  const roleTargetBudgets: Record<Role, number> = {
    P: Math.round(totalBudget * weights.P),
    D: Math.round(totalBudget * weights.D),
    C: Math.round(totalBudget * weights.C),
    A: Math.round(totalBudget * weights.A),
  };

  const selectedPlayers: Player[] = [];

  // ==========================================
  // 1. SELEZIONE PORTIERI (BLOCCO DELLA STESSA SQUADRA)
  // ==========================================
  const pinnedKeepers = pinnedPlayers.filter(p => p.role === 'P');
  pinnedKeepers.forEach(p => selectedPlayers.push(p));

  let primaryGoalkeeperTeam: string | null = pinnedKeepers.length > 0 ? pinnedKeepers[0].team : null;

  const keepersCount = settings.slots.P;

  if (!primaryGoalkeeperTeam) {
    // Riserva 1 credito per ogni portiere di riserva ancora da comprare
    const starterCap = Math.max(1, roleTargetBudgets.P - (keepersCount - 1));
    const keeperCandidates = availablePlayers
      .filter(p => p.role === 'P' && !usedIds.has(p.id))
      .map(p => {
        const price = priceFor(p);
        const score = scoreFor(p);
        const fit = score * 3 - Math.abs(price - (roleTargetBudgets.P * 0.85)) * 0.7;
        return { player: p, price, fit };
      })
      .filter(c => c.price <= starterCap)
      .sort((a, b) => b.fit - a.fit);

    const bestStarter = keeperCandidates[0]?.player || availablePlayers
      .filter(p => p.role === 'P' && !usedIds.has(p.id))
      .sort((a, b) => priceFor(a) - priceFor(b))[0];
    if (bestStarter) {
      selectedPlayers.push(bestStarter);
      usedIds.add(bestStarter.id);
      primaryGoalkeeperTeam = bestStarter.team;
    }
  }

  // Riempi le riserve portiere della STESSA SQUADRA
  while (selectedPlayers.filter(p => p.role === 'P').length < keepersCount) {
    const sameTeamBackup = availablePlayers
      .filter(p => p.role === 'P' && p.team === primaryGoalkeeperTeam && !usedIds.has(p.id))
      .sort((a, b) => priceFor(a) - priceFor(b))[0];

    const backup = sameTeamBackup || availablePlayers
      .filter(p => p.role === 'P' && !usedIds.has(p.id))
      .sort((a, b) => priceFor(a) - priceFor(b))[0];

    if (!backup) break;
    selectedPlayers.push(backup);
    usedIds.add(backup.id);
  }

  // ==========================================
  // 2. DIFESA, CENTROCAMPO, ATTACCO: OTTIMO ESATTO VIA PROGRAMMAZIONE DINAMICA
  // ==========================================
  // Con budget molto alti la DP lavora in unità di credito aggregate per restare O(1200) celle
  const unit = Math.max(1, Math.ceil(totalBudget / 1200));
  const toUnits = (credits: number) => Math.max(1, Math.ceil(credits / unit));

  // Modulo di riferimento per decidere quanti slot sono "da titolare" in ogni reparto:
  // quello consigliato dalla strategia se ammesso, altrimenti il primo modulo ammesso
  const allowed = allowedFormations(settings);
  const recommended = (STRATEGIES[settings.strategy] || STRATEGIES.balanced).recommendedFormation;
  const shapeName = allowed.includes(recommended) ? recommended : allowed[0];
  const shape = FORMATIONS[shapeName] || FORMATIONS['3-4-3'];

  const outfieldRoles: Role[] = ['D', 'C', 'A'];
  const starterNeedByRole = {} as Record<Role, number>;
  const benchNeedByRole = {} as Record<Role, number>;
  const targetUnitsByRole = {} as Record<Role, number>;

  for (const role of outfieldRoles) {
    // I pinned occupano prima gli slot da titolare (in ordine di score)
    const pinnedInRole = pinnedPlayers
      .filter(p => p.role === role)
      .sort((a, b) => scoreFor(b) - scoreFor(a));
    pinnedInRole.forEach(p => selectedPlayers.push(p));

    const starterSlots = Math.min(shape[role as 'D' | 'C' | 'A'], settings.slots[role]);
    const benchSlots = settings.slots[role] - starterSlots;
    const pinnedAsStarters = Math.min(starterSlots, pinnedInRole.length);
    const pinnedAsBench = Math.min(benchSlots, pinnedInRole.length - pinnedAsStarters);

    starterNeedByRole[role] = starterSlots - pinnedAsStarters;
    benchNeedByRole[role] = benchSlots - pinnedAsBench;

    const pinnedSpend = pinnedInRole.reduce((sum, p) => sum + priceFor(p), 0);
    targetUnitsByRole[role] = Math.max(0, Math.round((totalBudget * weights[role] - pinnedSpend) / unit));
  }

  const unitsAlreadySpent = selectedPlayers.reduce((sum, p) => sum + toUnits(priceFor(p)), 0);
  const budgetUnits = Math.max(0, Math.floor(totalBudget / unit) - unitsAlreadySpent);

  const solutions = {} as Record<Role, RoleSolution>;
  let allFeasible = true;

  for (const role of outfieldRoles) {
    const cands = pruneCandidates(
      availablePlayers
        .filter(p => p.role === role && !usedIds.has(p.id))
        .map(p => ({ player: p, price: toUnits(priceFor(p)), realPrice: priceFor(p), score: scoreFor(p) }))
        .filter(c => c.price <= budgetUnits)
    );
    const solution = solveRoleKnapsack(cands, starterNeedByRole[role], benchNeedByRole[role], budgetUnits);
    solutions[role] = solution;
    if (!solution.bestAt.some(v => v !== Number.NEGATIVE_INFINITY)) {
      allFeasible = false;
    }
  }

  if (allFeasible) {
    const costs = combineRoles(
      outfieldRoles.map(role => ({ bestAt: solutions[role].bestAt, target: targetUnitsByRole[role] })),
      budgetUnits,
      STRATEGY_ADHERENCE * unit
    );
    if (costs) {
      outfieldRoles.forEach((role, idx) => {
        for (const cand of solutions[role].pick(costs[idx])) {
          selectedPlayers.push(cand.player);
          usedIds.add(cand.player.id);
        }
      });
    }
  }

  // Riempimento d'emergenza (pool giocatori insufficiente o DP non fattibile):
  // massimizza la titolarità restando nel budget quando possibile
  const emergencyFill = () => {
    let remaining = totalBudget - selectedPlayers.reduce((sum, p) => sum + priceFor(p), 0);
    for (const role of outfieldRoles) {
      let missing = settings.slots[role] - selectedPlayers.filter(p => p.role === role).length;
      while (missing > 0) {
        const pool = availablePlayers.filter(p => p.role === role && !usedIds.has(p.id));
        const affordable = pool
          .filter(p => priceFor(p) <= Math.max(1, remaining - (missing - 1)))
          .sort((a, b) => b.starterProbability - a.starterProbability)[0];
        const fallback = affordable || pool.sort((a, b) => priceFor(a) - priceFor(b))[0];
        if (!fallback) break;
        selectedPlayers.push(fallback);
        usedIds.add(fallback.id);
        remaining -= priceFor(fallback);
        missing--;
      }
    }
  };
  // Con la DP andata a buon fine i conteggi sono già completi: il fill copre solo i casi limite
  emergencyFill();

  // ==========================================
  // 3. DIVERSIFICAZIONE: MAX GIOCATORI DI MOVIMENTO PER SQUADRA
  // ==========================================
  let remainingBudget = totalBudget - selectedPlayers.reduce((sum, p) => sum + priceFor(p), 0);
  for (let guard = 0; guard < 10; guard++) {
    const teamCounts = new Map<string, number>();
    selectedPlayers
      .filter(p => p.role !== 'P')
      .forEach(p => teamCounts.set(p.team, (teamCounts.get(p.team) || 0) + 1));

    const overTeam = [...teamCounts.entries()].find(([, n]) => n > MAX_PER_TEAM)?.[0];
    if (!overTeam) break;

    const weakest = selectedPlayers
      .filter(p => p.role !== 'P' && p.team === overTeam && !pinnedIds.includes(p.id))
      .sort((a, b) => scoreFor(a) - scoreFor(b))[0];
    if (!weakest) break;

    const replacement = availablePlayers
      .filter(p =>
        p.role === weakest.role &&
        !usedIds.has(p.id) &&
        p.team !== overTeam &&
        (teamCounts.get(p.team) || 0) < MAX_PER_TEAM &&
        priceFor(p) <= priceFor(weakest) + remainingBudget &&
        scoreFor(p) >= scoreFor(weakest) - 25 // non sacrificare troppa qualità per diversificare
      )
      .sort((a, b) => scoreFor(b) - scoreFor(a))[0];
    if (!replacement) break;

    usedIds.delete(weakest.id);
    usedIds.add(replacement.id);
    selectedPlayers[selectedPlayers.indexOf(weakest)] = replacement;
    remainingBudget -= priceFor(replacement) - priceFor(weakest);
  }

  // ==========================================
  // 3b. UPGRADE FINALE SUL BUDGET RESIDUO
  // ==========================================
  // Reinveste i crediti avanzati (arrotondamenti DP e swap di diversificazione):
  // ogni scambio migliora lo score, resta nel budget e rispetta il tetto per squadra
  for (let guard = 0; guard < 20; guard++) {
    remainingBudget = totalBudget - selectedPlayers.reduce((sum, p) => sum + priceFor(p), 0);
    if (remainingBudget <= 0) break;

    const teamCounts = new Map<string, number>();
    selectedPlayers
      .filter(p => p.role !== 'P')
      .forEach(p => teamCounts.set(p.team, (teamCounts.get(p.team) || 0) + 1));

    const roleSpend = {} as Record<Role, number>;
    for (const role of outfieldRoles) {
      roleSpend[role] = selectedPlayers
        .filter(p => p.role === role)
        .reduce((sum, p) => sum + priceFor(p), 0);
    }

    let best: { out: Player; in: Player; gain: number } | null = null;
    for (const owned of selectedPlayers) {
      if (owned.role === 'P' || pinnedIds.includes(owned.id)) continue;
      const budgetCap = priceFor(owned) + remainingBudget;
      const target = roleTargetBudgets[owned.role];
      const spend = roleSpend[owned.role];
      for (const cand of availablePlayers) {
        if (cand.role !== owned.role || usedIds.has(cand.id)) continue;
        if (priceFor(cand) > budgetCap) continue;
        // Stesso obiettivo della DP: score meno la penalità di deviazione dal target di reparto
        const newSpend = spend + priceFor(cand) - priceFor(owned);
        const deviationChange = Math.abs(newSpend - target) - Math.abs(spend - target);
        const gain = scoreFor(cand) - scoreFor(owned) - STRATEGY_ADHERENCE * deviationChange;
        if (gain <= 0 || (best && gain <= best.gain)) continue;
        const sameTeam = cand.team === owned.team;
        if (!sameTeam && (teamCounts.get(cand.team) || 0) >= MAX_PER_TEAM) continue;
        best = { out: owned, in: cand, gain };
      }
    }
    if (!best) break;

    usedIds.delete(best.out.id);
    usedIds.add(best.in.id);
    selectedPlayers[selectedPlayers.indexOf(best.out)] = best.in;
  }

  // 4. Calcolo metriche di riepilogo
  const totalSpent = selectedPlayers.reduce((sum, p) => sum + priceFor(p), 0);

  const budgetBreakdown: Record<Role, number> = {
    P: selectedPlayers.filter(p => p.role === 'P').reduce((sum, p) => sum + priceFor(p), 0),
    D: selectedPlayers.filter(p => p.role === 'D').reduce((sum, p) => sum + priceFor(p), 0),
    C: selectedPlayers.filter(p => p.role === 'C').reduce((sum, p) => sum + priceFor(p), 0),
    A: selectedPlayers.filter(p => p.role === 'A').reduce((sum, p) => sum + priceFor(p), 0),
  };

  const budgetPercentages = {
    P: totalSpent > 0 ? Math.round((budgetBreakdown.P / totalSpent) * 100) : 0,
    D: totalSpent > 0 ? Math.round((budgetBreakdown.D / totalSpent) * 100) : 0,
    C: totalSpent > 0 ? Math.round((budgetBreakdown.C / totalSpent) * 100) : 0,
    A: totalSpent > 0 ? Math.round((budgetBreakdown.A / totalSpent) * 100) : 0,
  };

  const { formation, startingXI, bench } = selectStartingXI(selectedPlayers, settings);

  const projectedFantaPoints = parseFloat(
    startingXI.reduce((sum, p) => sum + p.expectedPoints, 0).toFixed(1)
  );

  const projectedGoals = selectedPlayers.reduce((sum, p) => sum + p.expectedGoals, 0);
  const projectedAssists = selectedPlayers.reduce((sum, p) => sum + p.expectedAssists, 0);
  const penaltyTakersCount = selectedPlayers.filter(p => p.isPenaltyTaker).length;
  const averageStarterProbability = Math.round(
    selectedPlayers.reduce((sum, p) => sum + p.starterProbability, 0) / Math.max(1, selectedPlayers.length)
  );

  const strategyObj = STRATEGIES[settings.strategy] || STRATEGIES.balanced;

  return {
    id: `squad-${Date.now()}`,
    name: `Rosa ${strategyObj.name.split(' ')[1] || 'Ottimizzata'} (${totalBudget}cr)`,
    season: settings.selectedSeason || '2026-27',
    strategy: settings.strategy,
    createdAt: Date.now(),
    players: selectedPlayers,
    pinnedPlayerIds: pinnedIds,
    totalBudget,
    budgetSpent: totalSpent,
    budgetRemaining: Math.max(0, totalBudget - totalSpent),
    projectedFantaPoints,
    projectedGoals,
    projectedAssists,
    averageStarterProbability,
    penaltyTakersCount,
    budgetBreakdown,
    budgetPercentages,
    formation,
    startingXI,
    bench,
  };
}

/**
 * Seleziona l'11 titolare migliore e la panchina: con modulo 'auto' valuta
 * tutti i moduli ammessi sulla rosa reale e sceglie quello con più punti attesi
 */
function selectStartingXI(
  players: Player[],
  settings: LeagueSettings
): { formation: string; startingXI: Player[]; bench: Player[] } {
  const sorted: Record<Role, Player[]> = {
    P: players.filter(p => p.role === 'P').sort((a, b) => b.expectedPoints - a.expectedPoints),
    D: players.filter(p => p.role === 'D').sort((a, b) => b.expectedPoints - a.expectedPoints),
    C: players.filter(p => p.role === 'C').sort((a, b) => b.expectedPoints - a.expectedPoints),
    A: players.filter(p => p.role === 'A').sort((a, b) => b.expectedPoints - a.expectedPoints),
  };

  const candidates = allowedFormations(settings);

  let best: { formation: string; startingXI: Player[]; points: number } | null = null;

  for (const name of candidates) {
    const shape = FORMATIONS[name];
    if (!shape) continue;
    if (sorted.D.length < shape.D || sorted.C.length < shape.C || sorted.A.length < shape.A) continue;

    const xi = [
      ...sorted.P.slice(0, 1),
      ...sorted.D.slice(0, shape.D),
      ...sorted.C.slice(0, shape.C),
      ...sorted.A.slice(0, shape.A),
    ];
    const points = xi.reduce((sum, p) => sum + p.expectedPoints, 0);
    if (!best || points > best.points) {
      best = { formation: name, startingXI: xi, points };
    }
  }

  if (!best) {
    // Rosa incompleta: schiera comunque il meglio disponibile in 3-4-3
    const xi = [
      ...sorted.P.slice(0, 1),
      ...sorted.D.slice(0, 3),
      ...sorted.C.slice(0, 4),
      ...sorted.A.slice(0, 3),
    ];
    best = { formation: '3-4-3', startingXI: xi, points: 0 };
  }

  const startingIds = new Set(best.startingXI.map(p => p.id));
  const bench = players.filter(p => !startingIds.has(p.id));

  return { formation: best.formation, startingXI: best.startingXI, bench };
}

/**
 * XI titolare e panchina per una rosa già costruita (es. rosa custom):
 * stessa logica del generatore, rispetta targetFormation e modificatore difesa.
 */
export function buildStartingXI(
  players: Player[],
  settings: LeagueSettings
): { formation: string; startingXI: Player[]; bench: Player[] } {
  return selectStartingXI(players, settings);
}

/**
 * Trova alternative equivalenti (Piano B) per un giocatore dell'asta
 */
export function findAlternatives(
  targetPlayer: Player,
  allPlayers: Player[],
  totalBudget: number,
  participants: number = 8,
  currentSquadIds: string[] = []
): Player[] {
  const targetPrice = calculateDynamicPrice(targetPlayer, totalBudget, participants);
  const minPrice = Math.max(1, targetPrice * 0.7);
  const maxPrice = targetPrice * 1.35;

  return allPlayers
    .filter(p =>
      p.role === targetPlayer.role &&
      p.id !== targetPlayer.id &&
      !currentSquadIds.includes(p.id)
    )
    .map(p => {
      const price = calculateDynamicPrice(p, totalBudget, participants);
      const priceDiff = Math.abs(price - targetPrice);
      // Penalizza solo i giocatori più deboli del target; un piccolo bonus premia gli upgrade
      const downgrade = Math.max(0, targetPlayer.expectedPoints - p.expectedPoints);
      const upgrade = Math.max(0, p.expectedPoints - targetPlayer.expectedPoints);
      const score = 100 - (priceDiff * 2) - (downgrade * 15) + Math.min(10, upgrade * 5);
      return { player: p, score, price };
    })
    .filter(item => item.price >= minPrice && item.price <= maxPrice)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.player);
}
