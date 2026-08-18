import { Player, Role, HistoricalStats } from '../types';

/**
 * Motore di Proiezione Statistica Ponderata (Weighted Moving Average)
 * Basato sui dati storici reali delle stagioni precedenti (t-1 e t-2) e FVM/Quotazione.
 */

export function calculateProjectedStats(
  role: Role,
  quotation: number,
  fvm: number | null,
  history: HistoricalStats[] = [],
  name: string = ''
): {
  projectedFantaAvg: number;
  projectedGoals: number;
  projectedAssists: number;
  starterProbability: number;
  tier: 1 | 2 | 3 | 4 | 5;
  valueIndex: number;
  isPenaltyTaker: boolean;
  isFreeKickTaker: boolean;
} {
  const t1 = history[0]; // Stagione precedente più recente
  const t2 = history[1]; // Due stagioni fa

  // 1. Stima FantaMedia di base da Quotazione / FVM
  let baselineFM = 6.0;
  const priceIndicator = fvm ? fvm / 10 : quotation;
  
  if (role === 'A') {
    if (priceIndicator >= 30) baselineFM = 8.2;
    else if (priceIndicator >= 22) baselineFM = 7.4;
    else if (priceIndicator >= 15) baselineFM = 6.8;
    else if (priceIndicator >= 8) baselineFM = 6.3;
    else baselineFM = 5.9;
  } else if (role === 'C') {
    if (priceIndicator >= 25) baselineFM = 7.3;
    else if (priceIndicator >= 18) baselineFM = 6.7;
    else if (priceIndicator >= 10) baselineFM = 6.3;
    else baselineFM = 5.9;
  } else if (role === 'D') {
    if (priceIndicator >= 20) baselineFM = 6.6;
    else if (priceIndicator >= 13) baselineFM = 6.3;
    else if (priceIndicator >= 7) baselineFM = 6.0;
    else baselineFM = 5.7;
  } else {
    // Portiere
    if (priceIndicator >= 15) baselineFM = 5.5;
    else if (priceIndicator >= 10) baselineFM = 5.2;
    else baselineFM = 4.8;
  }

  let projectedFantaAvg = baselineFM;

  // 2. Applicazione del modello pesato su dati storici reali
  if (t1 && t1.played >= 10) {
    if (t2 && t2.played >= 10) {
      // Entrambe le stagioni storiche disponibili: 60% t-1, 25% t-2, 15% baseline
      projectedFantaAvg = (t1.fantaAvg * 0.60) + (t2.fantaAvg * 0.25) + (baselineFM * 0.15);
    } else {
      // Solo t-1 disponibile: 75% t-1, 25% baseline
      projectedFantaAvg = (t1.fantaAvg * 0.75) + (baselineFM * 0.25);
    }
  } else if (t2 && t2.played >= 15) {
    // Solo t-2 disponibile: 50% t-2, 50% baseline
    projectedFantaAvg = (t2.fantaAvg * 0.50) + (baselineFM * 0.50);
  }

  projectedFantaAvg = parseFloat(projectedFantaAvg.toFixed(2));

  // 3. Proiezione Gol ed Assist
  let projectedGoals = 0;
  let projectedAssists = 0;

  if (t1 && t1.played >= 15) {
    // Se abbiamo storico solido
    projectedGoals = Math.round(t1.goals * 0.7 + (t2 ? t2.goals * 0.3 : t1.goals * 0.3));
    projectedAssists = Math.round(t1.assists * 0.7 + (t2 ? t2.assists * 0.3 : t1.assists * 0.3));
  } else {
    // Stima da ruolo e quotazione
    if (role === 'A') {
      projectedGoals = quotation >= 30 ? 18 : quotation >= 22 ? 12 : quotation >= 14 ? 7 : quotation >= 8 ? 4 : 1;
      projectedAssists = quotation >= 20 ? 5 : 2;
    } else if (role === 'C') {
      projectedGoals = quotation >= 24 ? 9 : quotation >= 16 ? 5 : quotation >= 10 ? 2 : 0;
      projectedAssists = quotation >= 18 ? 6 : quotation >= 10 ? 3 : 1;
    } else if (role === 'D') {
      projectedGoals = quotation >= 18 ? 3 : quotation >= 10 ? 1 : 0;
      projectedAssists = quotation >= 18 ? 5 : quotation >= 10 ? 2 : 0;
    }
  }

  // 4. Titolarità stimata
  let starterProbability = 80;
  if (t1 && t1.played > 0) {
    starterProbability = Math.min(95, Math.round((t1.played / 38) * 100));
  } else {
    starterProbability = quotation >= 18 ? 92 : quotation >= 10 ? 85 : quotation >= 4 ? 65 : 30;
  }

  // 5. Rigoristi / Piazzati
  const knownPenalties = [
    'calhanoglu', 'vlahovic', 'martinez', 'zaccagni', 'gudmundsson', 'orsolini',
    'dybala', 'dovbyk', 'kean', 'lukaku', 'pulisic', 'zapata', 'pessina',
    'pinamonti', 'cutrone', 'lucca', 'thauvin', 'pohjanpalo', 'tengstedt', 'bonny', 'marin',
    'duda', 'fazzini', 'esposito', 'krstovic', 'taremi', 'pasalic', 'gaetano', 'strefezza',
    'malen', 'dia'
  ];

  const hasScoredPenalties = (t1 && t1.penaltiesScored > 1) || (t2 && t2.penaltiesScored > 1);
  const isPenaltyTaker = hasScoredPenalties || knownPenalties.some(k => name.toLowerCase().includes(k));
  const isFreeKickTaker = quotation >= 16 || isPenaltyTaker;

  // 6. Tier
  let tier: 1 | 2 | 3 | 4 | 5 = 5;
  if (projectedFantaAvg >= 7.8 || (role === 'C' && projectedFantaAvg >= 7.2) || (role === 'D' && projectedFantaAvg >= 6.5)) tier = 1;
  else if (projectedFantaAvg >= 7.1 || (role === 'C' && projectedFantaAvg >= 6.6) || (role === 'D' && projectedFantaAvg >= 6.2)) tier = 2;
  else if (projectedFantaAvg >= 6.5 || (role === 'C' && projectedFantaAvg >= 6.2) || (role === 'D' && projectedFantaAvg >= 5.9)) tier = 3;
  else if (projectedFantaAvg >= 6.0) tier = 4;
  else tier = 5;

  // 7. Indice di convenienza (Value Index = expectedPoints / estimatedPrice * 10)
  const estPrice = Math.max(1, fvm ? Math.round(fvm / 2) : quotation);
  const valueIndex = parseFloat(((projectedFantaAvg / estPrice) * 10).toFixed(2));

  return {
    projectedFantaAvg,
    projectedGoals,
    projectedAssists,
    starterProbability,
    tier,
    valueIndex,
    isPenaltyTaker,
    isFreeKickTaker
  };
}
