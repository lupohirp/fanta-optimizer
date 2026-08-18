import { 
  Player, 
  Role, 
  LeagueSettings, 
  GeneratedSquad, 
  StrategyType 
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

  // Prezzo base sul listino a 500
  let price500 = player.estimatedPrice500 || player.quotation || 1;

  // I top player (tier 1 e 2) subiscono una crescita esponenziale con la scarsità
  if (player.tier === 1) {
    price500 = price500 * (1 + (scarcityFactor - 1) * 1.4);
  } else if (player.tier === 2) {
    price500 = price500 * (1 + (scarcityFactor - 1) * 1.1);
  } else if (player.tier === 5) {
    // I low cost restano bassi (1-2 crediti)
    return Math.max(1, Math.round(budgetRatio));
  }

  const calculated = Math.round(price500 * budgetRatio);
  return Math.max(1, calculated);
}

/**
 * Pesi percentuali di budget per reparto in base alla strategia
 */
export function getStrategyWeights(settings: LeagueSettings): { P: number; D: number; C: number; A: number } {
  const strat = STRATEGIES[settings.strategy] || STRATEGIES.balanced;
  const weights = { ...strat.budgetWeights };

  // Se il modificatore di difesa è attivo e la strategia non lo includeva già, potenzia la difesa
  if (settings.defenseModifier && settings.strategy !== 'defense_modifier') {
    weights.D += 0.05;
    weights.A -= 0.03;
    weights.C -= 0.02;
  }

  // Se è attivo il bonus porta inviolata, aumenta leggermente l'investimento sul portiere
  if (settings.cleanSheetBonus) {
    weights.P += 0.02;
    weights.C -= 0.01;
    weights.D -= 0.01;
  }

  // Normalizza la somma a 1.0
  const sum = weights.P + weights.D + weights.C + weights.A;
  return {
    P: weights.P / sum,
    D: weights.D / sum,
    C: weights.C / sum,
    A: weights.A / sum,
  };
}

/**
 * Configurazione degli slot per ruolo con target di prezzo e tier
 */
const SLOT_CONFIGS: Record<Role, Array<{ label: string; share: number; minPrice?: number; maxPrice?: number; tierTarget: number }>> = {
  P: [
    { label: '1° Portiere Titolare Top', share: 0.85, minPrice: 15, tierTarget: 1 },
    { label: '2° Portiere Riserva (Stessa Squadra)', share: 0.10, maxPrice: 6, tierTarget: 4 },
    { label: '3° Portiere (Stessa Squadra)', share: 0.05, maxPrice: 2, tierTarget: 5 }
  ],
  D: [
    { label: '1° Top Difesa / Modificatore', share: 0.36, minPrice: 18, tierTarget: 1 },
    { label: '2° Semitop Spinta', share: 0.24, minPrice: 12, tierTarget: 2 },
    { label: '3° Titolare da Bonus', share: 0.16, minPrice: 8, tierTarget: 3 },
    { label: '4° Titolare Sicuro', share: 0.10, minPrice: 4, tierTarget: 3 },
    { label: '5° Titolare Regolare', share: 0.06, minPrice: 3, tierTarget: 4 },
    { label: '6° Rotazione', share: 0.04, maxPrice: 3, tierTarget: 4 },
    { label: '7° Scommessa', share: 0.02, maxPrice: 2, tierTarget: 5 },
    { label: '8° Copertura (1 cr)', share: 0.02, maxPrice: 1, tierTarget: 5 }
  ],
  C: [
    { label: '1° Top Rigorista/Bonus', share: 0.38, minPrice: 30, tierTarget: 1 },
    { label: '2° Semitop Incursore', share: 0.24, minPrice: 18, tierTarget: 2 },
    { label: '3° Titolare Bonus', share: 0.16, minPrice: 10, tierTarget: 3 },
    { label: '4° Titolare Sicuro', share: 0.10, minPrice: 5, tierTarget: 3 },
    { label: '5° Regolare', share: 0.05, minPrice: 3, tierTarget: 4 },
    { label: '6° Rotazione', share: 0.03, maxPrice: 3, tierTarget: 4 },
    { label: '7° Scommessa', share: 0.02, maxPrice: 2, tierTarget: 5 },
    { label: '8° Copertura (1 cr)', share: 0.02, maxPrice: 1, tierTarget: 5 }
  ],
  A: [
    { label: '1° Top Bomber Assoluto', share: 0.58, minPrice: 80, tierTarget: 1 },
    { label: '2° Secondo Titolare', share: 0.22, minPrice: 25, tierTarget: 2 },
    { label: '3° Terzo Attaccante', share: 0.12, minPrice: 10, tierTarget: 3 },
    { label: '4° Titolare Provincia', share: 0.05, minPrice: 4, tierTarget: 3 },
    { label: '5° Spaccapartite', share: 0.02, maxPrice: 3, tierTarget: 4 },
    { label: '6° Scommessa (1 cr)', share: 0.01, maxPrice: 1, tierTarget: 5 }
  ]
};

/**
 * Score complessivo di un calciatore per l'algoritmo di selezione
 */
function computePlayerScore(player: Player, settings: LeagueSettings): number {
  let score = player.expectedPoints * 10;

  // Premia la titolarità (fondamentale per non prendere s.v.)
  score += (player.starterProbability / 100) * 15;

  // Bonus rigoristi
  if (player.isPenaltyTaker) {
    score += 12;
  }

  // Bonus piazzati
  if (player.isFreeKickTaker) {
    score += 5;
  }

  // Modificatore di difesa: premia difensori con media voto pura alta
  if (settings.defenseModifier && player.role === 'D') {
    score += player.expectedPoints >= 6.3 ? 12 : 4;
  }

  // Bonus porta inviolata per i portieri
  if (settings.cleanSheetBonus && player.role === 'P') {
    score += player.tier === 1 ? 15 : 5;
  }

  return score;
}

/**
 * Motore principale di generazione ed ottimizzazione rosa
 */
export function optimizeSquad(
  allPlayers: Player[],
  settings: LeagueSettings,
  pinnedIds: string[] = [],
  blacklistedIds: string[] = []
): GeneratedSquad {
  const weights = getStrategyWeights(settings);
  const totalBudget = settings.totalBudget;
  const participants = settings.participants;

  // Filtra blacklist
  const availablePlayers = allPlayers.filter(p => !blacklistedIds.includes(p.id));
  const usedIds = new Set<string>();

  // Giocatori pinnati (inseriti prioritariamente)
  const pinnedPlayers = availablePlayers.filter(p => pinnedIds.includes(p.id));
  pinnedPlayers.forEach(p => usedIds.add(p.id));

  // Budget target per ruolo
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

  // Se non c'è ancora un portiere titolare pinnato, seleziona il miglior portiere titolare
  if (!primaryGoalkeeperTeam) {
    const keeperCandidates = availablePlayers
      .filter(p => p.role === 'P' && !usedIds.has(p.id))
      .map(p => {
        const price = calculateDynamicPrice(p, totalBudget, participants);
        const score = computePlayerScore(p, settings);
        const fit = score * 3 - Math.abs(price - (roleTargetBudgets.P * 0.85)) * 0.7;
        return { player: p, price, score, fit };
      })
      .filter(c => c.price <= roleTargetBudgets.P - 2)
      .sort((a, b) => b.fit - a.fit);

    const bestStarter = keeperCandidates[0]?.player || availablePlayers.filter(p => p.role === 'P').sort((a, b) => b.expectedPoints - a.expectedPoints)[0];
    if (bestStarter) {
      selectedPlayers.push(bestStarter);
      usedIds.add(bestStarter.id);
      primaryGoalkeeperTeam = bestStarter.team;
    }
  }

  // Riempi i rimanenti slot portiere con riserve DELLA STESSA SQUADRA
  const keepersCount = settings.slots.P;
  while (selectedPlayers.filter(p => p.role === 'P').length < keepersCount) {
    // Cerca portiere della stessa squadra
    const sameTeamBackup = availablePlayers
      .filter(p => p.role === 'P' && p.team === primaryGoalkeeperTeam && !usedIds.has(p.id))
      .sort((a, b) => calculateDynamicPrice(a, totalBudget, participants) - calculateDynamicPrice(b, totalBudget, participants))[0];

    if (sameTeamBackup) {
      selectedPlayers.push(sameTeamBackup);
      usedIds.add(sameTeamBackup.id);
    } else {
      // Fallback a 1 credito
      const anyCheapBackup = availablePlayers
        .filter(p => p.role === 'P' && !usedIds.has(p.id))
        .sort((a, b) => calculateDynamicPrice(a, totalBudget, participants) - calculateDynamicPrice(b, totalBudget, participants))[0];
      if (anyCheapBackup) {
        selectedPlayers.push(anyCheapBackup);
        usedIds.add(anyCheapBackup.id);
      } else {
        break;
      }
    }
  }

  // ==========================================
  // 2. SELEZIONE DIFESA, CENTROCAMPO, ATTACCO
  // ==========================================
  const otherRoles: Role[] = ['D', 'C', 'A'];

  otherRoles.forEach(role => {
    const requiredCount = settings.slots[role];
    const pinnedInRole = pinnedPlayers.filter(p => p.role === role);
    const slots = SLOT_CONFIGS[role];

    // Spesa sui pinnati
    const spentOnPinned = pinnedInRole.reduce(
      (sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants),
      0
    );

    let budgetLeftInRole = Math.max(requiredCount - pinnedInRole.length, roleTargetBudgets[role] - spentOnPinned);

    // Aggiungi prima i pinnati
    pinnedInRole.forEach(p => selectedPlayers.push(p));

    // Riempi i rimanenti slot
    let neededCount = requiredCount - pinnedInRole.length;
    const availableSlots = slots.slice(pinnedInRole.length);

    availableSlots.forEach((slot, idx) => {
      if (neededCount <= 0) return;

      const remainingSlots = neededCount;
      const targetForSlot = Math.max(1, Math.round(budgetLeftInRole * slot.share));
      const maxAffordable = Math.max(1, budgetLeftInRole - (remainingSlots - 1));

      // Scala i prezzi min/max sul budget totale attuale
      const scale = totalBudget / 500;
      const scaledMinPrice = slot.minPrice ? Math.max(1, Math.round(slot.minPrice * scale)) : undefined;
      const scaledMaxPrice = slot.maxPrice ? Math.max(1, Math.round(slot.maxPrice * scale)) : undefined;

      const candidates = availablePlayers
        .filter(p => p.role === role && !usedIds.has(p.id))
        .map(p => {
          const price = calculateDynamicPrice(p, totalBudget, participants);
          const score = computePlayerScore(p, settings);

          let fit = score * 3;
          if (scaledMinPrice && price < scaledMinPrice) fit -= (scaledMinPrice - price) * 8;
          if (scaledMaxPrice && price > scaledMaxPrice) fit -= (price - scaledMaxPrice) * 12;
          fit -= Math.abs(price - targetForSlot) * 0.7;

          return { player: p, price, score, fit };
        })
        .filter(c => c.price <= maxAffordable)
        .sort((a, b) => b.fit - a.fit);

      const chosen = candidates[0] || availablePlayers
        .filter(p => p.role === role && !usedIds.has(p.id))
        .map(p => ({ player: p, price: calculateDynamicPrice(p, totalBudget, participants) }))
        .filter(c => c.price <= maxAffordable)
        .sort((a, b) => a.price - b.price)[0];

      if (chosen) {
        const p = chosen.player;
        const price = chosen.price;
        selectedPlayers.push(p);
        usedIds.add(p.id);
        budgetLeftInRole -= price;
        neededCount--;
      }
    });

    // Fallback di emergenza se mancano slot
    while (neededCount > 0) {
      const fallback = availablePlayers
        .filter(p => p.role === role && !usedIds.has(p.id))
        .sort((a, b) => calculateDynamicPrice(a, totalBudget, participants) - calculateDynamicPrice(b, totalBudget, participants))[0];

      if (fallback) {
        selectedPlayers.push(fallback);
        usedIds.add(fallback.id);
      }
      neededCount--;
    }
  });

  // ==========================================
  // 3. FASE DI UPGRADING SUL BUDGET RIMANENTE
  // ==========================================
  let currentSpent = selectedPlayers.reduce(
    (sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants),
    0
  );
  let remainingBudget = totalBudget - currentSpent;

  for (let step = 0; step < 12 && remainingBudget >= 4; step++) {
    let upgraded = false;
    for (const upgradeRole of ['A', 'C', 'D'] as Role[]) {
      const roleItems = selectedPlayers
        .map((p, idx) => ({ p, idx, price: calculateDynamicPrice(p, totalBudget, participants) }))
        .filter(item => item.p.role === upgradeRole && !pinnedIds.includes(item.p.id) && item.price < (totalBudget * 0.15))
        .sort((a, b) => a.price - b.price);

      for (const item of roleItems) {
        const maxAffordable = item.price + remainingBudget;
        const upgradeCandidates = availablePlayers
          .filter(p => 
            p.role === upgradeRole && 
            !usedIds.has(p.id) && 
            calculateDynamicPrice(p, totalBudget, participants) > item.price && 
            calculateDynamicPrice(p, totalBudget, participants) <= maxAffordable && 
            p.expectedPoints > item.p.expectedPoints
          )
          .sort((a, b) => b.expectedPoints - a.expectedPoints);

        if (upgradeCandidates[0]) {
          const better = upgradeCandidates[0];
          const newPrice = calculateDynamicPrice(better, totalBudget, participants);
          usedIds.delete(item.p.id);
          usedIds.add(better.id);
          selectedPlayers[item.idx] = better;
          remainingBudget -= (newPrice - item.price);
          upgraded = true;
          break;
        }
      }
      if (upgraded) break;
    }
    if (!upgraded) break;
  }

  // 4. Calcolo metriche di riepilogo
  const totalSpent = selectedPlayers.reduce(
    (sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants),
    0
  );

  const budgetBreakdown: Record<Role, number> = {
    P: selectedPlayers.filter(p => p.role === 'P').reduce((sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants), 0),
    D: selectedPlayers.filter(p => p.role === 'D').reduce((sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants), 0),
    C: selectedPlayers.filter(p => p.role === 'C').reduce((sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants), 0),
    A: selectedPlayers.filter(p => p.role === 'A').reduce((sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants), 0),
  };

  const budgetPercentages = {
    P: totalSpent > 0 ? Math.round((budgetBreakdown.P / totalSpent) * 100) : 0,
    D: totalSpent > 0 ? Math.round((budgetBreakdown.D / totalSpent) * 100) : 0,
    C: totalSpent > 0 ? Math.round((budgetBreakdown.C / totalSpent) * 100) : 0,
    A: totalSpent > 0 ? Math.round((budgetBreakdown.A / totalSpent) * 100) : 0,
  };

  // 5. Formazione titolare e panchina
  const { formation, startingXI, bench } = selectStartingXI(selectedPlayers, settings);

  const projectedFantaPoints = parseFloat(
    startingXI.reduce((sum, p) => sum + p.expectedPoints, 0).toFixed(1)
  );

  const projectedGoals = selectedPlayers.reduce((sum, p) => sum + p.expectedGoals, 0);
  const projectedAssists = selectedPlayers.reduce((sum, p) => sum + p.expectedAssists, 0);
  const penaltyTakersCount = selectedPlayers.filter(p => p.isPenaltyTaker).length;
  const averageStarterProbability = Math.round(
    selectedPlayers.reduce((sum, p) => sum + p.starterProbability, 0) / selectedPlayers.length
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
 * Seleziona l'11 titolare migliore e la panchina in base al modulo
 */
function selectStartingXI(
  players: Player[],
  settings: LeagueSettings
): { formation: string; startingXI: Player[]; bench: Player[] } {
  const sortedP = players.filter(p => p.role === 'P').sort((a, b) => b.expectedPoints - a.expectedPoints);
  const sortedD = players.filter(p => p.role === 'D').sort((a, b) => b.expectedPoints - a.expectedPoints);
  const sortedC = players.filter(p => p.role === 'C').sort((a, b) => b.expectedPoints - a.expectedPoints);
  const sortedA = players.filter(p => p.role === 'A').sort((a, b) => b.expectedPoints - a.expectedPoints);

  let formation = settings.targetFormation;
  if (formation === 'auto') {
    if (settings.strategy === 'defense_modifier') {
      formation = '4-3-3';
    } else if (settings.strategy === 'midfield_power') {
      formation = '3-5-2';
    } else {
      formation = '3-4-3';
    }
  }

  let defCount = 3;
  let midCount = 4;
  let attCount = 3;

  if (formation === '4-3-3') {
    defCount = 4; midCount = 3; attCount = 3;
  } else if (formation === '3-5-2') {
    defCount = 3; midCount = 5; attCount = 2;
  } else if (formation === '4-4-2') {
    defCount = 4; midCount = 4; attCount = 2;
  } else if (formation === '4-2-3-1') {
    defCount = 4; midCount = 5; attCount = 1;
  }

  const startingP = sortedP.slice(0, 1);
  const startingD = sortedD.slice(0, defCount);
  const startingC = sortedC.slice(0, midCount);
  const startingA = sortedA.slice(0, attCount);

  const startingXI = [...startingP, ...startingD, ...startingC, ...startingA];
  const startingIds = new Set(startingXI.map(p => p.id));
  const bench = players.filter(p => !startingIds.has(p.id));

  return { formation, startingXI, bench };
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
      const pointsDiff = Math.abs(p.expectedPoints - targetPlayer.expectedPoints);
      const score = 100 - (priceDiff * 2) - (pointsDiff * 15);
      return { player: p, score, price };
    })
    .filter(item => item.price >= minPrice && item.price <= maxPrice)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.player);
}
