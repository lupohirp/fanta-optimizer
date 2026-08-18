import { Player, Role, LeagueSettings, GeneratedSquad, LiveAuctionItem } from '../types';
import { STRATEGIES } from '../data/players';

/**
 * Calcola il prezzo d'asta stimato calibrato in base al budget totale e al numero di squadre.
 */
export function calculateDynamicPrice(
  player: Player,
  totalBudget: number,
  participants: number = 8
): number {
  const baseRatio = totalBudget / 500;

  // Moltiplicatore di scarsità in base al numero di partecipanti:
  // In leghe numerose (10-12 squadre) i top player salgono di prezzo per scarsità;
  // In leghe a 6 squadre i prezzi dei top calano perché l'offerta è abbondante.
  let scarcityMultiplier = 1.0;
  if (player.tier === 1) {
    if (participants === 6) scarcityMultiplier = 0.85;
    else if (participants === 10) scarcityMultiplier = 1.15;
    else if (participants === 12) scarcityMultiplier = 1.25;
  } else if (player.tier === 2) {
    if (participants === 6) scarcityMultiplier = 0.90;
    else if (participants === 10) scarcityMultiplier = 1.08;
    else if (participants === 12) scarcityMultiplier = 1.15;
  } else if (player.tier === 5) {
    // I low cost rimangono ad 1 o poco più
    scarcityMultiplier = 1.0;
  }

  const rawPrice = player.estimatedPrice500 * baseRatio * scarcityMultiplier;
  const roundedPrice = Math.max(1, Math.round(rawPrice));

  return roundedPrice;
}

/**
 * Ottiene la ripartizione ideale dei crediti per reparto in base alla strategia e ai modificatori.
 */
export function getStrategyWeights(settings: LeagueSettings): { P: number; D: number; C: number; A: number } {
  const strategy = STRATEGIES[settings.strategy] || STRATEGIES.balanced;
  let weights = { ...strategy.budgetWeights };

  // Se modificatore difesa è attivo e la strategia non è già defense_modifier, potenzia la difesa
  if (settings.defenseModifier && settings.strategy !== 'defense_modifier') {
    weights.D += 0.05;
    weights.A -= 0.03;
    weights.C -= 0.02;
  }

  // Se imbattibilità attiva, aumenta leggermente il budget portieri
  if (settings.cleanSheetBonus) {
    weights.P += 0.02;
    weights.C -= 0.01;
    weights.A -= 0.01;
  }

  // Normalizza pesi a 1.0
  const total = weights.P + weights.D + weights.C + weights.A;
  return {
    P: weights.P / total,
    D: weights.D / total,
    C: weights.C / total,
    A: weights.A / total,
  };
}

/**
 * Slot template per reparto per guidare l'acquisto equilibrato
 */
interface RoleSlotBlueprint {
  tierTarget: number;
  budgetShareOfRole: number; // Quota del budget di ruolo per questo slot
  label: string;
}

const SLOT_BLUEPRINTS: Record<Role, RoleSlotBlueprint[]> = {
  P: [
    { tierTarget: 1, budgetShareOfRole: 0.85, label: '1° Slot - Titolare Top/Semità' },
    { tierTarget: 4, budgetShareOfRole: 0.10, label: '2° Slot - Riserva Squadra' },
    { tierTarget: 5, budgetShareOfRole: 0.05, label: '3° Slot - Terzo Portiere (1 cr)' },
  ],
  D: [
    { tierTarget: 1, budgetShareOfRole: 0.35, label: '1° Slot - Top da Bonus / Modificatore' },
    { tierTarget: 2, budgetShareOfRole: 0.25, label: '2° Slot - Semitop Spinta' },
    { tierTarget: 2, budgetShareOfRole: 0.16, label: '3° Slot - Titolare Affidabile' },
    { tierTarget: 3, budgetShareOfRole: 0.10, label: '4° Slot - Titolare Medio' },
    { tierTarget: 3, budgetShareOfRole: 0.07, label: '5° Slot - Titolare Regolare' },
    { tierTarget: 4, budgetShareOfRole: 0.04, label: '6° Slot - Rotazione' },
    { tierTarget: 5, budgetShareOfRole: 0.02, label: '7° Slot - Scommessa Low-Cost' },
    { tierTarget: 5, budgetShareOfRole: 0.01, label: '8° Slot - Tappabuchi (1 cr)' },
  ],
  C: [
    { tierTarget: 1, budgetShareOfRole: 0.38, label: '1° Slot - Top Rigorista/Bonus' },
    { tierTarget: 1, budgetShareOfRole: 0.24, label: '2° Slot - Semitop Incursore' },
    { tierTarget: 2, budgetShareOfRole: 0.16, label: '3° Slot - Titolare da Bonus' },
    { tierTarget: 3, budgetShareOfRole: 0.10, label: '4° Slot - Titolare Sicuro' },
    { tierTarget: 3, budgetShareOfRole: 0.06, label: '5° Slot - Regolare' },
    { tierTarget: 4, budgetShareOfRole: 0.03, label: '6° Slot - Rotazione/Piazzati' },
    { tierTarget: 5, budgetShareOfRole: 0.02, label: '7° Slot - Scommessa Giovane' },
    { tierTarget: 5, budgetShareOfRole: 0.01, label: '8° Slot - Copertura (1 cr)' },
  ],
  A: [
    { tierTarget: 1, budgetShareOfRole: 0.58, label: '1° Slot - Top Bomber / Leader' },
    { tierTarget: 2, budgetShareOfRole: 0.22, label: '2° Slot - Secondo Titolare' },
    { tierTarget: 2, budgetShareOfRole: 0.12, label: '3° Slot - Terzo Attaccante' },
    { tierTarget: 3, budgetShareOfRole: 0.05, label: '4° Slot - Titolare Provincia/Rigori' },
    { tierTarget: 4, budgetShareOfRole: 0.02, label: '5° Slot - Alternanza / Spaccapartite' },
    { tierTarget: 5, budgetShareOfRole: 0.01, label: '6° Slot - Scommessa da 1 credito' },
  ]
};

/**
 * Score di appetibilità complessivo per il modello di ottimizzazione
 */
function computePlayerScore(player: Player, settings: LeagueSettings): number {
  let score = player.expectedPoints * 10;

  // Bonus titolarità
  score += (player.starterProbability / 100) * 8;

  // Bonus rigorista / piazzati
  if (player.isPenaltyTaker) score += 6;
  if (player.isFreeKickTaker) score += 3;

  // Strategie specifiche
  if (settings.strategy === 'defense_modifier' && player.role === 'D') {
    score += (player.expectedPoints >= 6.3 ? 8 : 2);
  }
  if (settings.strategy === 'midfield_power' && player.role === 'C') {
    score += (player.expectedGoals >= 5 ? 10 : 3);
  }
  if (settings.strategy === 'heavy_attack' && player.role === 'A' && player.tier === 1) {
    score += 15;
  }
  if (settings.strategy === 'hype_young' && player.trend === 'up' && player.tier >= 3) {
    score += 8;
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

  // Giocatori pinnati
  const pinnedPlayers = availablePlayers.filter(p => pinnedIds.includes(p.id));

  // Budget target per ruolo
  const roleTargetBudgets: Record<Role, number> = {
    P: Math.round(totalBudget * weights.P),
    D: Math.round(totalBudget * weights.D),
    C: Math.round(totalBudget * weights.C),
    A: Math.round(totalBudget * weights.A),
  };

  // Seleziona per ogni ruolo
  const selectedPlayers: Player[] = [...pinnedPlayers];

  const roles: Role[] = ['P', 'D', 'C', 'A'];

  roles.forEach(role => {
    const requiredCount = settings.slots[role];
    const pinnedInRole = pinnedPlayers.filter(p => p.role === role);
    let neededCount = requiredCount - pinnedInRole.length;

    if (neededCount <= 0) return;

    // Giocatori disponibili in questo ruolo (non già selezionati)
    const rolePool = availablePlayers
      .filter(p => p.role === role && !selectedPlayers.some(sp => sp.id === p.id))
      .map(p => ({
        player: p,
        dynamicPrice: calculateDynamicPrice(p, totalBudget, participants),
        score: computePlayerScore(p, settings)
      }));

    // Calcola budget rimanente per questo ruolo
    const spentOnPinned = pinnedInRole.reduce(
      (sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants),
      0
    );
    let roleBudgetRemaining = Math.max(neededCount, roleTargetBudgets[role] - spentOnPinned);

    // Usa blueprint degli slot per guidare la selezione
    const blueprints = SLOT_BLUEPRINTS[role].slice(pinnedInRole.length);

    blueprints.forEach((blueprint, idx) => {
      if (neededCount <= 0) return;

      const isLastSlots = neededCount <= 2;
      const targetSlotBudget = Math.max(
        1,
        Math.round(roleBudgetRemaining * blueprint.budgetShareOfRole)
      );

      // Cerca candidati ideali vicini al budget target e al tier target
      let candidates = rolePool.filter(c => !selectedPlayers.some(sp => sp.id === c.player.id));

      if (isLastSlots || blueprint.tierTarget === 5) {
        // Preferisci low-cost a 1-3 crediti
        candidates.sort((a, b) => {
          if (a.dynamicPrice !== b.dynamicPrice) return a.dynamicPrice - b.dynamicPrice;
          return b.score - a.score;
        });
      } else {
        // Cerca il miglior rapporto qualità/prezzo compatibile con il budget residuo
        const maxAffordable = Math.max(1, roleBudgetRemaining - (neededCount - 1));
        candidates = candidates.filter(c => c.dynamicPrice <= maxAffordable);

        candidates.sort((a, b) => {
          // Differenza dal target slot budget
          const diffA = Math.abs(a.dynamicPrice - targetSlotBudget);
          const diffB = Math.abs(b.dynamicPrice - targetSlotBudget);
          
          // Value density: score / price
          const valueA = a.score / Math.max(1, a.dynamicPrice * 0.7 + diffA * 0.3);
          const valueB = b.score / Math.max(1, b.dynamicPrice * 0.7 + diffB * 0.3);

          return valueB - valueA;
        });
      }

      const bestCandidate = candidates[0];
      if (bestCandidate) {
        selectedPlayers.push(bestCandidate.player);
        roleBudgetRemaining -= bestCandidate.dynamicPrice;
        neededCount--;
      }
    });

    // Fallback nel caso mancasse qualche slot
    while (neededCount > 0) {
      const remainingCandidates = rolePool
        .filter(c => !selectedPlayers.some(sp => sp.id === c.player.id))
        .sort((a, b) => a.dynamicPrice - b.dynamicPrice);

      if (remainingCandidates[0]) {
        selectedPlayers.push(remainingCandidates[0].player);
      }
      neededCount--;
    }
  });

  // Ribilanciamento / Refinement fine: se sfora il budget totale, esegui downgrade dei non-pinnati
  let currentTotalSpent = selectedPlayers.reduce(
    (sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants),
    0
  );

  let attempts = 0;
  while (currentTotalSpent > totalBudget && attempts < 30) {
    attempts++;
    // Trova il giocatore non-pinnato più costoso che possiamo sostituire con uno più economico mantenendo buona fanta-media
    const nonPinned = selectedPlayers
      .filter(p => !pinnedIds.includes(p.id))
      .map(p => ({
        player: p,
        price: calculateDynamicPrice(p, totalBudget, participants)
      }))
      .filter(item => item.price > 2)
      .sort((a, b) => b.price - a.price);

    if (nonPinned.length === 0) break;

    const toReplace = nonPinned[0].player;
    const cheaperOptions = availablePlayers
      .filter(p => 
        p.role === toReplace.role && 
        !selectedPlayers.some(sp => sp.id === p.id) &&
        calculateDynamicPrice(p, totalBudget, participants) < calculateDynamicPrice(toReplace, totalBudget, participants)
      )
      .sort((a, b) => {
        const pA = calculateDynamicPrice(a, totalBudget, participants);
        const pB = calculateDynamicPrice(b, totalBudget, participants);
        return pA - pB;
      });

    if (cheaperOptions.length > 0) {
      const idx = selectedPlayers.findIndex(p => p.id === toReplace.id);
      selectedPlayers[idx] = cheaperOptions[0];
      currentTotalSpent = selectedPlayers.reduce(
        (sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants),
        0
      );
    } else {
      break;
    }
  }

  // Calcola statistiche complessive della rosa generata
  const totalSpent = selectedPlayers.reduce(
    (sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants),
    0
  );

  const budgetBreakdown = {
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

  // Seleziona formazione titolare ideale (Starting XI)
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
  // Ordina per fanta-media e probabilità titolare
  const pList = [...players.filter(p => p.role === 'P')].sort((a, b) => b.expectedPoints - a.expectedPoints);
  const dList = [...players.filter(p => p.role === 'D')].sort((a, b) => b.expectedPoints - a.expectedPoints);
  const cList = [...players.filter(p => p.role === 'C')].sort((a, b) => b.expectedPoints - a.expectedPoints);
  const aList = [...players.filter(p => p.role === 'A')].sort((a, b) => b.expectedPoints - a.expectedPoints);

  let formation = '3-4-3';

  if (settings.targetFormation !== 'auto') {
    formation = settings.targetFormation;
  } else {
    // Scegli modulo in base alla strategia
    if (settings.strategy === 'defense_modifier') formation = '4-3-3';
    else if (settings.strategy === 'midfield_power') formation = '3-5-2';
    else if (settings.strategy === 'heavy_attack') formation = '3-4-3';
    else formation = '3-4-3';
  }

  let dCount = 3;
  let cCount = 4;
  let aCount = 3;

  if (formation === '4-3-3') {
    dCount = 4; cCount = 3; aCount = 3;
  } else if (formation === '3-5-2') {
    dCount = 3; cCount = 5; aCount = 2;
  } else if (formation === '4-4-2') {
    dCount = 4; cCount = 4; aCount = 2;
  } else if (formation === '4-2-3-1') {
    dCount = 4; cCount = 5; aCount = 1;
  }

  const startingXI: Player[] = [
    ...pList.slice(0, 1),
    ...dList.slice(0, dCount),
    ...cList.slice(0, cCount),
    ...aList.slice(0, aCount),
  ];

  const startingIds = new Set(startingXI.map(p => p.id));
  const bench = players.filter(p => !startingIds.has(p.id));

  return { formation, startingXI, bench };
}

/**
 * Trova alternative / "Piano B" per un giocatore in asta
 */
export function findAlternatives(
  targetPlayer: Player,
  allPlayers: Player[],
  budget: number,
  participants: number,
  currentSquadPlayerIds: string[]
): Player[] {
  const targetPrice = calculateDynamicPrice(targetPlayer, budget, participants);
  const priceMargin = Math.max(3, Math.round(targetPrice * 0.35));

  return allPlayers
    .filter(p => 
      p.role === targetPlayer.role &&
      p.id !== targetPlayer.id &&
      !currentSquadPlayerIds.includes(p.id)
    )
    .map(p => ({
      player: p,
      price: calculateDynamicPrice(p, budget, participants),
      priceDiff: Math.abs(calculateDynamicPrice(p, budget, participants) - targetPrice),
      pointsDiff: Math.abs(p.expectedPoints - targetPlayer.expectedPoints),
    }))
    .filter(item => item.price <= targetPrice + priceMargin)
    .sort((a, b) => {
      // Priorità a vicinanza fanta-media e prezzo simile
      const scoreA = a.player.expectedPoints * 10 - a.priceDiff * 0.5;
      const scoreB = b.player.expectedPoints * 10 - b.priceDiff * 0.5;
      return scoreB - scoreA;
    })
    .slice(0, 4)
    .map(item => item.player);
}

/**
 * Genera la checklist per l'assistente d'asta in tempo reale
 */
export function generateLiveAuctionSlots(
  settings: LeagueSettings,
  squad: GeneratedSquad,
  allPlayers: Player[]
): LiveAuctionItem[] {
  const items: LiveAuctionItem[] = [];
  const roles: Role[] = ['P', 'D', 'C', 'A'];

  roles.forEach(role => {
    const rolePlayers = squad.players.filter(p => p.role === role);
    const blueprints = SLOT_BLUEPRINTS[role];

    rolePlayers.forEach((player, idx) => {
      const blueprint = blueprints[idx] || {
        tierTarget: player.tier,
        budgetShareOfRole: 0.1,
        label: `${idx + 1}° Slot ${role}`
      };

      const price = calculateDynamicPrice(player, settings.totalBudget, settings.participants);
      const alternatives = findAlternatives(
        player,
        allPlayers,
        settings.totalBudget,
        settings.participants,
        [player.id]
      );

      items.push({
        id: `slot-${role}-${idx + 1}`,
        role,
        slotNumber: idx + 1,
        slotTitle: blueprint.label,
        targetBudget: price,
        boughtPlayer: player, // default al suggerito
        boughtPrice: price,
        status: 'pending',
        suggestedAlternatives: alternatives
      });
    });
  });

  return items;
}
