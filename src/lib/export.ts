import { GeneratedSquad, Player, Role } from '../types';
import { calculateDynamicPrice } from './optimizer';

/**
 * Format squad as an emoji-rich text for WhatsApp / Telegram sharing
 */
export function formatSquadForWhatsApp(
  squad: GeneratedSquad,
  totalBudget: number,
  participants: number
): string {
  const getPlayersByRole = (role: Role) =>
    squad.players.filter(p => p.role === role);

  const formatPlayerLine = (p: Player) => {
    const price = calculateDynamicPrice(p, totalBudget, participants);
    const tags = [];
    if (p.isPenaltyTaker) tags.push('🎯 Rigorista');
    if (p.isFreeKickTaker) tags.push('📐 Piazzati');
    const tagStr = tags.length > 0 ? ` (${tags.join(', ')})` : '';
    return `• ${p.name} (${p.team}) - ${price}cr [FM ${p.expectedPoints.toFixed(1)}]${tagStr}`;
  };

  const pList = getPlayersByRole('P').map(formatPlayerLine).join('\n');
  const dList = getPlayersByRole('D').map(formatPlayerLine).join('\n');
  const cList = getPlayersByRole('C').map(formatPlayerLine).join('\n');
  const aList = getPlayersByRole('A').map(formatPlayerLine).join('\n');

  return `🏆 *${squad.name}*
💰 Budget: ${squad.budgetSpent}/${totalBudget} cr (${squad.budgetRemaining} rimasti)
⭐ FantaMedia Titolari: ${squad.projectedFantaPoints} pt/giornata
⚽ Gol Stimati: ~${squad.projectedGoals} | 🅰️ Assist: ~${squad.projectedAssists}
🎯 Rigoristi in rosa: ${squad.penaltyTakersCount}

🧤 *PORTIERI (3)* [Spesa: ${squad.budgetBreakdown.P}cr - ${squad.budgetPercentages.P}%]
${pList}

🛡️ *DIFENSORI (8)* [Spesa: ${squad.budgetBreakdown.D}cr - ${squad.budgetPercentages.D}%]
${dList}

⚡ *CENTROCAMPISTI (8)* [Spesa: ${squad.budgetBreakdown.C}cr - ${squad.budgetPercentages.C}%]
${cList}

⚔️ *ATTACCANTI (6)* [Spesa: ${squad.budgetBreakdown.A}cr - ${squad.budgetPercentages.A}%]
${aList}

_Generato con Fantacalcio Squad Optimizer_ 🚀`;
}

/**
 * Export squad to CSV
 */
export function exportSquadToCSV(
  squad: GeneratedSquad,
  totalBudget: number,
  participants: number
): void {
  const headers = ['Ruolo', 'Nome', 'Squadra', 'Prezzo Stimato (cr)', 'FantaMedia Attesa', 'Quotazione', 'Rigorista', 'Piazzati', 'Titolarita %', 'Note'];
  
  const rows = squad.players.map(p => {
    const price = calculateDynamicPrice(p, totalBudget, participants);
    return [
      p.role,
      `"${p.name}"`,
      `"${p.team}"`,
      price,
      p.expectedPoints.toFixed(1),
      p.quotation,
      p.isPenaltyTaker ? 'SI' : 'NO',
      p.isFreeKickTaker ? 'SI' : 'NO',
      `${p.starterProbability}%`,
      `"${p.notes || ''}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${squad.name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * LocalStorage persistence keys
 */
const STORAGE_SAVED_SQUADS_KEY = 'fanta_optimizer_saved_squads';

export function getSavedSquads(): GeneratedSquad[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_SQUADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load squads', e);
    return [];
  }
}

export function saveSquadToStorage(squad: GeneratedSquad): GeneratedSquad[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedSquads();
    const filtered = existing.filter(s => s.id !== squad.id);
    const updated = [squad, ...filtered];
    localStorage.setItem(STORAGE_SAVED_SQUADS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save squad', e);
    return [];
  }
}

export function deleteSquadFromStorage(squadId: string): GeneratedSquad[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedSquads();
    const updated = existing.filter(s => s.id !== squadId);
    localStorage.setItem(STORAGE_SAVED_SQUADS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete squad', e);
    return [];
  }
}
