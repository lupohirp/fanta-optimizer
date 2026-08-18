import { Player, Role } from '../types';
import { normalizeRole, derivePlayerStats } from './importer';
import { INITIAL_PLAYERS } from '../data/players';

const STORAGE_SYNC_TIMESTAMP = 'fanta_optimizer_last_sync_time';
const STORAGE_SYNC_SOURCE = 'fanta_optimizer_last_sync_source';

export interface SyncResult {
  success: boolean;
  players: Player[];
  lastUpdated: string;
  source: string;
  count: number;
  message: string;
}

/**
 * Esegue la sincronizzazione automatica live
 */
export async function syncLivePlayers(customFeedUrl?: string): Promise<SyncResult> {
  try {
    const url = customFeedUrl 
      ? `/api/sync-players?customUrl=${encodeURIComponent(customFeedUrl)}`
      : `/api/sync-players`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Errore HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.source === 'custom_url' && typeof data.data === 'string') {
      // Parse custom CSV text from remote Google Sheets or Web URL
      const lines = data.data.split('\n');
      const parsedPlayers: Player[] = [];

      lines.forEach((line: string, idx: number) => {
        const parts = line.split(',').map((p: string) => p.replace(/^["']|["']$/g, '').trim());
        if (parts.length >= 3) {
          const rawRole = parts[0] || parts[1];
          const role = normalizeRole(rawRole);
          const name = parts[1] || parts[0];
          const team = parts[2] || 'Serie A';
          const rawQt = parts[3] ? parseInt(parts[3]) : 10;
          const rawFvm = parts[4] ? parseFloat(parts[4]) : null;

          if (role && name && name.length > 1) {
            const stats = derivePlayerStats(rawQt, rawFvm, role, name);
            parsedPlayers.push({
              id: `live-${role}-${name.toLowerCase().replace(/\s+/g, '-')}-${idx}`,
              name,
              team,
              role,
              quotation: rawQt,
              estimatedPrice500: stats.estimatedPrice500,
              expectedPoints: stats.expectedPoints,
              tier: stats.tier,
              isPenaltyTaker: stats.isPenaltyTaker,
              isFreeKickTaker: stats.isFreeKickTaker,
              starterProbability: stats.starterProbability,
              expectedGoals: stats.expectedGoals,
              expectedAssists: stats.expectedAssists,
              trend: 'stable',
              notes: 'Sincronizzato da feed live remoto'
            });
          }
        }
      });

      if (parsedPlayers.length > 20) {
        saveSyncMetadata(data.lastUpdated, 'Feed URL Remoto (Google Sheets / Live)');
        return {
          success: true,
          players: parsedPlayers,
          lastUpdated: data.lastUpdated,
          source: 'Feed URL Remoto',
          count: parsedPlayers.length,
          message: `Sincronizzati ${parsedPlayers.length} calciatori dal tuo feed live!`
        };
      }
    }

    if (data.players && Array.isArray(data.players) && data.players.length > 0) {
      saveSyncMetadata(data.lastUpdated, data.source);
      return {
        success: true,
        players: data.players,
        lastUpdated: data.lastUpdated,
        source: data.source === 'remote_live_mirror' ? 'Mirror Live Serie A' : 'Listino Ufficiale Integrato',
        count: data.players.length,
        message: `Sincronizzazione completata: ${data.players.length} calciatori caricati.`
      };
    }

    throw new Error('Nessun dato valido ricevuto dal server.');
  } catch (err: any) {
    return {
      success: false,
      players: INITIAL_PLAYERS,
      lastUpdated: new Date().toISOString(),
      source: 'Fallback locale',
      count: INITIAL_PLAYERS.length,
      message: `Impossibile sincronizzare live: ${err.message}. Utilizzo lista locale.`
    };
  }
}

function saveSyncMetadata(timestamp: string, source: string) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_SYNC_TIMESTAMP, timestamp);
      localStorage.setItem(STORAGE_SYNC_SOURCE, source);
    } catch (e) {
      console.error(e);
    }
  }
}

export function getLastSyncInfo(): { timestamp: string | null; source: string | null; formattedTime: string } {
  if (typeof window === 'undefined') {
    return { timestamp: null, source: null, formattedTime: 'Iniziale' };
  }
  try {
    const rawTs = localStorage.getItem(STORAGE_SYNC_TIMESTAMP);
    const source = localStorage.getItem(STORAGE_SYNC_SOURCE) || 'Listino Ufficiale';
    if (!rawTs) return { timestamp: null, source, formattedTime: 'Oggi' };

    const date = new Date(rawTs);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMin < 1) return { timestamp: rawTs, source, formattedTime: 'Pochi secondi fa' };
    if (diffMin < 60) return { timestamp: rawTs, source, formattedTime: `${diffMin} min fa` };
    
    return {
      timestamp: rawTs,
      source,
      formattedTime: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    };
  } catch (e) {
    return { timestamp: null, source: null, formattedTime: 'Oggi' };
  }
}
