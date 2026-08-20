import { Player } from '../types';
import { INITIAL_PLAYERS } from '../data/players';
import { getCurrentSeason } from './season';

const STORAGE_SYNC_TIMESTAMP = 'fanta_optimizer_last_sync_time';
const STORAGE_SYNC_SEASON = 'fanta_optimizer_last_sync_season';

export interface SyncResult {
  success: boolean;
  players: Player[];
  season: string;
  lastUpdated: string;
  source: string;
  count: number;
  message: string;
  /** Quanti giocatori hanno un prezzo d'asta reale agganciato */
  marketMatches: number;
}

/**
 * Esegue la sincronizzazione automatica live per la stagione richiesta
 */
export async function syncLivePlayers(season?: string): Promise<SyncResult> {
  const targetSeason = season || getCurrentSeason();

  try {
    const url = `/api/sync-players?season=${encodeURIComponent(targetSeason)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Errore HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.players && Array.isArray(data.players) && data.players.length > 0) {
      saveSyncMetadata(data.lastUpdated, targetSeason);
      return {
        success: true,
        players: data.players,
        season: targetSeason,
        lastUpdated: data.lastUpdated,
        source: 'Listone Ufficiale Fantacalcio.it',
        count: data.players.length,
        marketMatches: typeof data.marketMatches === 'number' ? data.marketMatches : 0,
        message: `Sincronizzazione stagione ${targetSeason} completata: ${data.players.length} calciatori.`
      };
    }

    throw new Error('Nessun dato valido ricevuto dal server.');
  } catch (err: any) {
    return {
      success: false,
      players: INITIAL_PLAYERS,
      season: targetSeason,
      lastUpdated: new Date().toISOString(),
      source: 'Dataset locale',
      count: INITIAL_PLAYERS.length,
      marketMatches: 0,
      message: `Impossibile sincronizzare live: ${err.message}.`
    };
  }
}

function saveSyncMetadata(timestamp: string, season: string) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_SYNC_TIMESTAMP, timestamp);
      localStorage.setItem(STORAGE_SYNC_SEASON, season);
    } catch (e) {
      console.error(e);
    }
  }
}

export function getLastSyncInfo(): { timestamp: string | null; season: string; formattedTime: string } {
  if (typeof window === 'undefined') {
    return { timestamp: null, season: getCurrentSeason(), formattedTime: 'Iniziale' };
  }
  try {
    const rawTs = localStorage.getItem(STORAGE_SYNC_TIMESTAMP);
    const season = localStorage.getItem(STORAGE_SYNC_SEASON) || getCurrentSeason();
    if (!rawTs) return { timestamp: null, season, formattedTime: 'Oggi' };

    const date = new Date(rawTs);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMin < 1) return { timestamp: rawTs, season, formattedTime: 'Pochi secondi fa' };
    if (diffMin < 60) return { timestamp: rawTs, season, formattedTime: `${diffMin} min fa` };
    
    return {
      timestamp: rawTs,
      season,
      formattedTime: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    };
  } catch (e) {
    return { timestamp: null, season: getCurrentSeason(), formattedTime: 'Oggi' };
  }
}
