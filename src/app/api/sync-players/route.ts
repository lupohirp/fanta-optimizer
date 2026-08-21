import { NextResponse } from 'next/server';
import { INITIAL_PLAYERS } from '@/data/players';
import { Player, Role, HistoricalStats } from '@/types';
import { getCurrentSeason, getPreviousSeason } from '@/lib/season';
import { fetchMarketRows, attachMarketData } from '@/lib/market-source';
import { decodeEntities, stablePlayerId } from '@/lib/text';
import { marketPriceFor, marketRangeFor } from '@/lib/market';
import historicalStatsMap from '@/data/historical_stats_2025_26.json';

export const revalidate = 1800; // Cache for 30 minutes on Vercel

const teamMap: Record<string, string> = {
  'INT': 'Inter', 'MIL': 'Milan', 'JUV': 'Juventus', 'NAP': 'Napoli', 'ROM': 'Roma',
  'LAZ': 'Lazio', 'ATA': 'Atalanta', 'FIO': 'Fiorentina', 'BOL': 'Bologna', 'TOR': 'Torino',
  'MON': 'Monza', 'GEN': 'Genoa', 'UDI': 'Udinese', 'PAR': 'Parma', 'CAG': 'Cagliari',
  'VER': 'Verona', 'EMP': 'Empoli', 'COM': 'Como', 'VEN': 'Venezia', 'LEC': 'Lecce',
  'FRO': 'Frosinone', 'SAS': 'Sassuolo'
};

function normalize(str: string): string {
  return str
    .replace(/&#xE8;/g, 'e')
    .replace(/&#xE9;/g, 'e')
    .replace(/&#xE0;/g, 'a')
    .replace(/&#xF2;/g, 'o')
    .replace(/&#xF9;/g, 'u')
    .replace(/&#xEC;/g, 'i')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function findHistoricalStats(playerName: string, role: Role, playerTeam: string): any {
  const allStats: any[] = Object.values(historicalStatsMap);
  const pNorm = normalize(playerName);

  // 1. Strict Name + Role + Team
  let match = allStats.find(s => 
    s.role === role && 
    normalize(s.name) === pNorm && 
    (teamMap[s.team] === playerTeam || s.team === playerTeam)
  );
  if (match) return match;

  // 2. Strict Name + Role
  match = allStats.find(s => s.role === role && normalize(s.name) === pNorm);
  if (match) return match;

  // 3. Surname match + Role + Team
  match = allStats.find(s => {
    if (s.role !== role) return false;
    const isSameTeam = teamMap[s.team] === playerTeam || s.team === playerTeam;
    if (!isSameTeam) return false;
    const pSurname = normalize(playerName.split(' ')[0]);
    const sSurname = normalize(s.name.split(' ')[0]);
    return pSurname === sSurname;
  });
  if (match) return match;

  // 4. Surname token + Role (minimum 4 characters)
  match = allStats.find(s => {
    if (s.role !== role) return false;
    const pSurname = normalize(playerName.split(' ')[0]);
    const sSurname = normalize(s.name.split(' ')[0]);
    return pSurname === sSurname && pSurname.length >= 4;
  });
  return match || null;
}

function calibratePrice500(quotation: number, role: Role): number {
  const q = quotation || 1;

  if (role === 'A') {
    if (q >= 33) return Math.round(160 + (q - 33) * 20); // Lautaro, Malen ~ 180-200 cr
    if (q >= 28) return Math.round(110 + (q - 28) * 10); // Thuram, Hojlund ~ 120-150 cr
    if (q >= 22) return Math.round(55 + (q - 22) * 8);   // Kean, Yildiz, Douvikas ~ 60-90 cr
    if (q >= 15) return Math.round(20 + (q - 15) * 4.5); // Dovbyk, Dia, Cutrone ~ 25-45 cr
    if (q >= 8)  return Math.round(6 + (q - 8) * 2);     // Castro, Bonny, Esposito ~ 8-18 cr
    return Math.max(1, Math.round(q * 0.7));
  } else if (role === 'C') {
    if (q >= 28) return Math.round(52 + (q - 28) * 5);   // Paz N., McTominay, Calhanoglu ~ 55-68 cr
    if (q >= 22) return Math.round(34 + (q - 22) * 3);   // Pulisic, Zaccagni, Orsolini ~ 35-50 cr
    if (q >= 16) return Math.round(18 + (q - 16) * 2.5); // Barella, Reijnders, Da Cunha ~ 18-32 cr
    if (q >= 10) return Math.round(8 + (q - 10) * 1.6);  // Frendrup, Mandragora, Cataldi ~ 8-16 cr
    if (q >= 5)  return Math.round(3 + (q - 5) * 1);     // Titolari provincia ~ 3-7 cr
    return Math.max(1, Math.round(q * 0.5));
  } else if (role === 'D') {
    if (q >= 30) return Math.round(48 + (q - 30) * 4);   // Dimarco ~ 55-58 cr
    if (q >= 24) return Math.round(32 + (q - 24) * 2.5); // Theo, Bremer, Di Lorenzo ~ 32-45 cr
    if (q >= 17) return Math.round(18 + (q - 17) * 2);   // Buongiorno, Bastoni, Akanji ~ 18-30 cr
    if (q >= 10) return Math.round(7 + (q - 10) * 1.5);  // Bellanova, Mina, Solet, Martin ~ 7-16 cr
    if (q >= 5)  return Math.round(3 + (q - 5) * 0.8);   // Zappa, Kempf, Ndiaye ~ 3-6 cr
    return Math.max(1, Math.round(q * 0.4));
  } else {
    if (q >= 25) return Math.round(26 + (q - 25) * 1.2); // Martinez Jo., Sommer, Svilar, Maignan ~ 28-35 cr
    if (q >= 18) return Math.round(18 + (q - 18) * 1.1); // Di Gregorio, Carnesecchi, De Gea, Meret ~ 18-25 cr
    if (q >= 10) return Math.round(8 + (q - 10) * 1.2);  // Skorupski, Falcone, Okoye ~ 8-16 cr
    if (q >= 3)  return Math.round(2 + (q - 3) * 0.5);   // Riserve ~ 2-4 cr
    return 1;
  }
}

/**
 * Id stabile, con suffisso progressivo solo in caso di omonimia perfetta
 * (stesso nome, stessa squadra, stesso ruolo).
 */
function makeId(season: string, name: string, team: string, role: Role, seen: Map<string, number>): string {
  const base = stablePlayerId(season, name, team, role);
  const used = seen.get(base) || 0;
  seen.set(base, used + 1);
  return used === 0 ? base : `${base}-${used + 1}`;
}

/** Fascia di mercato dedotta dal prezzo d'asta, con soglie diverse per ruolo */
function tierFromPrice500(price500: number, role: Role): 1 | 2 | 3 | 4 | 5 {
  const cuts: Record<Role, number[]> = {
    A: [80, 35, 14, 5],
    C: [35, 18, 7, 3],
    D: [20, 10, 5, 2],
    P: [22, 12, 5, 2]
  };
  const [t1, t2, t3, t4] = cuts[role];
  if (price500 >= t1) return 1;
  if (price500 >= t2) return 2;
  if (price500 >= t3) return 3;
  if (price500 >= t4) return 4;
  return 5;
}

/**
 * Sostituisce le stime di prezzo con i prezzi realmente pagati nelle aste,
 * dove esistono, e ricalcola di conseguenza fascia e range.
 * Se la sorgente di mercato non risponde, i giocatori restano intatti.
 */
async function enrichWithMarket(players: Player[]): Promise<number> {
  try {
    const rows = await fetchMarketRows();
    const matched = attachMarketData(players, rows);

    for (const player of players) {
      if (!player.market) continue;
      // Riferimento standard: lega da 8 squadre con 500 crediti
      const real500 = marketPriceFor(player, 500, 8);
      if (real500 === null) continue;

      player.estimatedPrice500 = real500;
      player.avgAuctionPrice500 = real500;
      player.tier = tierFromPrice500(real500, player.role);
      player.budgetPercentage = parseFloat(((real500 / 500) * 100).toFixed(1));

      const range = marketRangeFor(player, 500, 8);
      if (range) {
        player.minAuctionPrice500 = range.min;
        player.maxAuctionPrice500 = range.max;
      }

      if (typeof player.market.trend7d === 'number' && Math.abs(player.market.trend7d) >= 0.5) {
        player.trend = player.market.trend7d > 0 ? 'up' : 'down';
      }
    }

    return matched;
  } catch {
    return 0;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetSeason = searchParams.get('season') || getCurrentSeason();
  const prevSeason1 = getPreviousSeason(targetSeason);

  const officialQuotazioniUrl = `https://www.fantacalcio.it/quotazioni-fantacalcio/${targetSeason}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(officialQuotazioniUrl, {
      signal: controller.signal,
      next: { revalidate: 1800 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      const regex = /<tr class="player-row"[^>]*data-filter-keywords="([^"]+)"[^>]*data-filter-role-classic="([^"]+)"[^>]*>[\s\S]*?<td class="player-team"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td class="player-classic-current-price"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td class="player-classic-fvm"[^>]*>([\s\S]*?)<\/td>/g;

      let match;
      const parsedPlayers: Player[] = [];
      // Omonimi nella stessa squadra e ruolo: si distinguono con un suffisso
      const idCounts = new Map<string, number>();

      while ((match = regex.exec(html)) !== null) {
        const name = decodeEntities(match[1]).trim();
        const role = match[2].trim().toUpperCase() as Role;
        const rawTeam = decodeEntities(match[3]).trim();
        const team = teamMap[rawTeam] || rawTeam;
        const quotation = parseInt(match[4].trim()) || 1;
        const rawFvm = parseInt(match[5].trim()) || null;

        const hist = findHistoricalStats(name, role, team);

        let expectedPoints = 6.0;
        let expectedGoals = 0;
        let expectedAssists = 0;
        let starterProbability = 50;
        let isPenaltyTaker = quotation >= 25;
        let isFreeKickTaker = quotation >= 16;
        let historicalStats: HistoricalStats[] = [];

        if (hist && hist.played > 0) {
          historicalStats = [{
            season: prevSeason1,
            played: hist.played,
            avgRating: hist.avgRating,
            fantaAvg: hist.fantaAvg,
            goals: hist.goals,
            goalsConceded: hist.goalsConceded,
            assists: hist.assists,
            penaltiesScored: hist.penaltiesScored,
            penaltiesTaken: hist.penaltiesTaken,
            yellowCards: hist.yellowCards,
            redCards: hist.redCards
          }];

          const played = hist.played;
          if (played >= 30) starterProbability = 95;
          else if (played >= 25) starterProbability = 90;
          else if (played >= 20) starterProbability = 82;
          else if (played >= 15) starterProbability = 68;
          else if (played >= 10) starterProbability = 50;
          else starterProbability = 35;

          expectedPoints = parseFloat(hist.fantaAvg.toFixed(2));
          expectedGoals = hist.goals;
          expectedAssists = hist.assists;
          isPenaltyTaker = hist.penaltiesScored > 0 || isPenaltyTaker;
        } else {
          // Stima per giocatori nuovi senza storico Serie A
          if (role === 'A') {
            expectedPoints = quotation >= 30 ? 8.2 : quotation >= 20 ? 7.4 : quotation >= 12 ? 6.8 : 6.1;
            expectedGoals = quotation >= 30 ? 16 : quotation >= 20 ? 10 : quotation >= 12 ? 6 : 2;
            expectedAssists = quotation >= 20 ? 4 : 1;
          } else if (role === 'C') {
            expectedPoints = quotation >= 25 ? 7.3 : quotation >= 18 ? 6.7 : quotation >= 10 ? 6.3 : 5.9;
            expectedGoals = quotation >= 20 ? 7 : quotation >= 12 ? 3 : 1;
            expectedAssists = quotation >= 18 ? 5 : 2;
          } else if (role === 'D') {
            expectedPoints = quotation >= 18 ? 6.5 : quotation >= 12 ? 6.2 : 5.8;
            expectedGoals = quotation >= 15 ? 2 : 0;
            expectedAssists = quotation >= 15 ? 4 : 1;
          } else {
            expectedPoints = quotation >= 14 ? 5.5 : 5.0;
          }
          starterProbability = quotation >= 18 ? 92 : quotation >= 10 ? 80 : 50;
        }

        const estimatedPrice500 = calibratePrice500(quotation, role);
        const tier = tierFromPrice500(estimatedPrice500, role);

        const budgetPercentage = parseFloat(((estimatedPrice500 / 500) * 100).toFixed(1));
        const volatility = tier === 1 ? 0.15 : tier === 2 ? 0.22 : tier === 3 ? 0.30 : 0.40;
        const minAuctionPrice500 = Math.max(1, Math.round(estimatedPrice500 * (1 - volatility)));
        const maxAuctionPrice500 = Math.max(minAuctionPrice500 + 1, Math.round(estimatedPrice500 * (1 + volatility)));

        parsedPlayers.push({
          id: makeId(targetSeason, name, team, role, idCounts),
          name,
          team,
          role,
          quotation,
          estimatedPrice500,
          expectedPoints,
          tier,
          isPenaltyTaker,
          isFreeKickTaker,
          starterProbability,
          expectedGoals,
          expectedAssists,
          trend: 'stable',
          notes: hist ? `Listone ${targetSeason} • ${hist.played} presenze nel ${prevSeason1} (Titolarità ${starterProbability}%)` : `Listone ${targetSeason} • Quotazione ${quotation} • FVM ${rawFvm || quotation}`,
          historicalStats,
          avgAuctionPrice500: estimatedPrice500,
          minAuctionPrice500,
          maxAuctionPrice500,
          budgetPercentage
        });
      }

      if (parsedPlayers.length > 100) {
        // Aggancia i prezzi realmente pagati nelle aste e ricalibra su quelli
        const marketMatches = await enrichWithMarket(parsedPlayers);

        return NextResponse.json({
          success: true,
          source: 'fantacalcio_official_live',
          season: targetSeason,
          players: parsedPlayers,
          count: parsedPlayers.length,
          marketMatches,
          lastUpdated: new Date().toISOString()
        });
      }
    }
  } catch (e) {
    // Fallback
  }

  // Anche sul dataset locale proviamo ad agganciare i prezzi d'asta reali
  const fallbackPlayers: Player[] = INITIAL_PLAYERS.map(p => ({ ...p }));
  const marketMatches = await enrichWithMarket(fallbackPlayers);

  return NextResponse.json({
    success: true,
    source: 'official_integrated_2026_27',
    season: targetSeason,
    players: fallbackPlayers,
    count: fallbackPlayers.length,
    marketMatches,
    lastUpdated: new Date().toISOString()
  });
}
