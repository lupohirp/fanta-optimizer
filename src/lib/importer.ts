import * as XLSX from 'xlsx';
import { Player, Role } from '../types';

/**
 * Normalizza il ruolo in P, D, C, A
 */
export function normalizeRole(rawRole: any): Role | null {
  if (!rawRole) return null;
  const str = String(rawRole).trim().toUpperCase();
  if (str.startsWith('P')) return 'P';
  if (str.startsWith('D')) return 'D';
  if (str.startsWith('C')) return 'C';
  if (str.startsWith('A')) return 'A';
  return null;
}

/**
 * Deriva le statistiche stimate (prezzo, FantaMedia attesa, tier) a partire da Quotazione e FVM
 */
export function derivePlayerStats(
  quotation: number,
  fvm: number | null,
  role: Role,
  name: string
): {
  estimatedPrice500: number;
  expectedPoints: number;
  tier: 1 | 2 | 3 | 4 | 5;
  starterProbability: number;
  expectedGoals: number;
  expectedAssists: number;
  isPenaltyTaker: boolean;
  isFreeKickTaker: boolean;
} {
  // Se è presente FVM (solitamente su 1000 crediti nel file di Fantacalcio.it), scala a 500
  let price500: number;
  if (fvm && fvm > 0) {
    price500 = fvm > 500 ? Math.round(fvm / 2) : Math.round(fvm);
  } else {
    // Altrimenti stima da quotazione con curva d'asta realistica per ruolo
    if (role === 'A') {
      if (quotation >= 30) price500 = Math.round(quotation * 3.5);
      else if (quotation >= 22) price500 = Math.round(quotation * 2.2);
      else if (quotation >= 15) price500 = Math.round(quotation * 1.2);
      else price500 = Math.max(1, Math.round(quotation * 0.5));
    } else if (role === 'C') {
      if (quotation >= 24) price500 = Math.round(quotation * 2.2);
      else if (quotation >= 18) price500 = Math.round(quotation * 1.5);
      else if (quotation >= 12) price500 = Math.round(quotation * 0.9);
      else price500 = Math.max(1, Math.round(quotation * 0.4));
    } else if (role === 'D') {
      if (quotation >= 18) price500 = Math.round(quotation * 1.8);
      else if (quotation >= 13) price500 = Math.round(quotation * 1.2);
      else if (quotation >= 8) price500 = Math.round(quotation * 0.6);
      else price500 = Math.max(1, Math.round(quotation * 0.3));
    } else {
      // P
      if (quotation >= 15) price500 = Math.round(quotation * 2.2);
      else if (quotation >= 10) price500 = Math.round(quotation * 1.2);
      else price500 = Math.max(1, Math.round(quotation * 0.3));
    }
  }

  price500 = Math.max(1, price500);

  // Calcola Tier
  let tier: 1 | 2 | 3 | 4 | 5 = 5;
  if (role === 'A') {
    if (price500 >= 85) tier = 1;
    else if (price500 >= 38) tier = 2;
    else if (price500 >= 15) tier = 3;
    else if (price500 >= 5) tier = 4;
    else tier = 5;
  } else if (role === 'C') {
    if (price500 >= 40) tier = 1;
    else if (price500 >= 20) tier = 2;
    else if (price500 >= 8) tier = 3;
    else if (price500 >= 3) tier = 4;
    else tier = 5;
  } else if (role === 'D') {
    if (price500 >= 22) tier = 1;
    else if (price500 >= 12) tier = 2;
    else if (price500 >= 5) tier = 3;
    else if (price500 >= 2) tier = 4;
    else tier = 5;
  } else {
    // P
    if (price500 >= 25) tier = 1;
    else if (price500 >= 15) tier = 2;
    else if (price500 >= 6) tier = 3;
    else if (price500 >= 2) tier = 4;
    else tier = 5;
  }

  // FantaMedia attesa
  let expectedPoints = 6.0;
  if (tier === 1) expectedPoints = role === 'A' ? 8.2 : role === 'C' ? 7.3 : role === 'D' ? 6.6 : 5.5;
  else if (tier === 2) expectedPoints = role === 'A' ? 7.4 : role === 'C' ? 6.7 : role === 'D' ? 6.3 : 5.3;
  else if (tier === 3) expectedPoints = role === 'A' ? 6.8 : role === 'C' ? 6.3 : role === 'D' ? 6.0 : 5.0;
  else if (tier === 4) expectedPoints = role === 'A' ? 6.3 : role === 'C' ? 6.0 : role === 'D' ? 5.8 : 4.8;
  else expectedPoints = role === 'A' ? 5.9 : role === 'C' ? 5.8 : role === 'D' ? 5.6 : 4.5;

  // Stima titolarità
  const starterProbability = tier <= 2 ? 92 : tier === 3 ? 85 : tier === 4 ? 65 : 35;

  // Stima gol ed assist
  let expectedGoals = 0;
  let expectedAssists = 0;
  if (role === 'A') {
    expectedGoals = tier === 1 ? 16 : tier === 2 ? 11 : tier === 3 ? 7 : tier === 4 ? 4 : 1;
    expectedAssists = tier <= 2 ? 5 : tier === 3 ? 3 : 1;
  } else if (role === 'C') {
    expectedGoals = tier === 1 ? 8 : tier === 2 ? 5 : tier === 3 ? 3 : tier === 4 ? 1 : 0;
    expectedAssists = tier <= 2 ? 6 : tier === 3 ? 3 : 1;
  } else if (role === 'D') {
    expectedGoals = tier === 1 ? 3 : tier === 2 ? 1 : 0;
    expectedAssists = tier === 1 ? 5 : tier === 2 ? 2 : 1;
  }

  // Rigoristi / Piazzati noti in base al nome
  const lowerName = name.toLowerCase();
  const knownPenaltyTakers = [
    'calhanoglu', 'vlahovic', 'martinez', 'lautaro', 'zaccagni', 'gudmundsson', 'orsolini',
    'dybala', 'dovbyk', 'kean', 'lukaku', 'pulisic', 'zapata', 'castellanos', 'pessina',
    'pinamonti', 'cutrone', 'lucca', 'thauvin', 'pohjanpalo', 'tengstedt', 'bonny', 'marin',
    'duda', 'fazzini', 'esposito', 'krstovic', 'taremi', 'pasalic', 'gaetano', 'strefezza'
  ];

  const isPenaltyTaker = knownPenaltyTakers.some(k => lowerName.includes(k));
  const isFreeKickTaker = tier <= 2 || isPenaltyTaker;

  return {
    estimatedPrice500: price500,
    expectedPoints,
    tier,
    starterProbability,
    expectedGoals,
    expectedAssists,
    isPenaltyTaker,
    isFreeKickTaker
  };
}

/**
 * Parsing di file Excel / CSV (Fantacalcio.it / Gazzetta / Custom)
 */
export async function parsePlayerFile(file: File): Promise<{ players: Player[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonRows || jsonRows.length === 0) {
          return resolve({ players: [], errors: ['Il file caricato è vuoto.'] });
        }

        const players: Player[] = [];
        const errors: string[] = [];

        jsonRows.forEach((row, idx) => {
          // Trova colonne flessibili (Fantacalcio.it, Gazzetta o generico)
          const rawRole = row.R || row.Ruolo || row.ROLE || row.RuoloMantra || row.r || '';
          const role = normalizeRole(rawRole);
          if (!role) return; // Salta righe d'intestazione o non valide

          const name = String(row.Nome || row.Giocatore || row.Calciatore || row.NAME || row.Player || '').trim();
          if (!name) return;

          const team = String(row.Squadra || row.Team || row.Club || row.sq || 'Serie A').trim();
          
          const rawQt = row['Qt. A'] || row['Qt.A'] || row['Qt. I'] || row.Quotazione || row.Quot || row.Qt || 1;
          const quotation = Math.max(1, parseInt(String(rawQt)) || 1);

          const rawFvm = row.FVM || row['FVM/1000'] || row['FVM/500'] || row.Prezzo || null;
          const fvm = rawFvm ? parseFloat(String(rawFvm)) : null;

          const id = row.Id || row.ID || `imported-${role}-${name.toLowerCase().replace(/\s+/g, '-')}-${idx}`;

          const stats = derivePlayerStats(quotation, fvm, role, name);

          players.push({
            id: String(id),
            name,
            team,
            role,
            quotation,
            estimatedPrice500: stats.estimatedPrice500,
            expectedPoints: stats.expectedPoints,
            tier: stats.tier,
            isPenaltyTaker: stats.isPenaltyTaker,
            isFreeKickTaker: stats.isFreeKickTaker,
            starterProbability: stats.starterProbability,
            expectedGoals: stats.expectedGoals,
            expectedAssists: stats.expectedAssists,
            trend: 'stable',
            notes: `Importato da listino ufficiale • Quotazione ${quotation}`
          });
        });

        resolve({ players, errors });
      } catch (err: any) {
        reject(new Error(`Errore durante la lettura del file: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Impossibile leggere il file selezionato.'));
    reader.readAsArrayBuffer(file);
  });
}
