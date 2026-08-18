import { NextResponse } from 'next/server';
import { INITIAL_PLAYERS } from '@/data/players';
import { Player, Role, HistoricalStats } from '@/types';
import { getCurrentSeason, getPreviousSeason } from '@/lib/season';
import historicalStatsMap from '@/data/historical_stats_2025_26.json';

export const revalidate = 1800; // Cache for 30 minutes on Vercel

const teamMap: Record<string, string> = {
  'INT': 'Inter', 'MIL': 'Milan', 'JUV': 'Juventus', 'NAP': 'Napoli', 'ROM': 'Roma',
  'LAZ': 'Lazio', 'ATA': 'Atalanta', 'FIO': 'Fiorentina', 'BOL': 'Bologna', 'TOR': 'Torino',
  'MON': 'Monza', 'GEN': 'Genoa', 'UDI': 'Udinese', 'PAR': 'Parma', 'CAG': 'Cagliari',
  'VER': 'Verona', 'EMP': 'Empoli', 'COM': 'Como', 'VEN': 'Venezia', 'LEC': 'Lecce',
  'FRO': 'Frosinone', 'SAS': 'Sassuolo'
};

function cleanName(str: string): string {
  return str
    .replace(/&#xE8;/g, 'e')
    .replace(/&#xE9;/g, 'e')
    .replace(/&#xE0;/g, 'a')
    .replace(/&#xF2;/g, 'o')
    .replace(/&#xF9;/g, 'u')
    .replace(/&#xEC;/g, 'i')
    .replace(/[\.\s\']/g, '')
    .toLowerCase();
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
      let idCounter = 1;

      while ((match = regex.exec(html)) !== null) {
        const name = match[1].trim();
        const role = match[2].trim().toUpperCase() as Role;
        const rawTeam = match[3].trim();
        const team = teamMap[rawTeam] || rawTeam;
        const quotation = parseInt(match[4].trim()) || 1;
        const rawFvm = parseInt(match[5].trim()) || null;

        const pClean = cleanName(name);
        const hist: any = Object.values(historicalStatsMap).find((s: any) => cleanName(s.name) === pClean || cleanName(s.name).includes(pClean) || pClean.includes(cleanName(s.name)));

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

        let estimatedPrice500 = rawFvm ? Math.max(1, Math.round(rawFvm / 2)) : Math.max(1, quotation);

        let tier: 1 | 2 | 3 | 4 | 5 = 5;
        if (role === 'A') {
          if (estimatedPrice500 >= 80) tier = 1;
          else if (estimatedPrice500 >= 35) tier = 2;
          else if (estimatedPrice500 >= 14) tier = 3;
          else if (estimatedPrice500 >= 5) tier = 4;
          else tier = 5;
        } else if (role === 'C') {
          if (estimatedPrice500 >= 35) tier = 1;
          else if (estimatedPrice500 >= 18) tier = 2;
          else if (estimatedPrice500 >= 7) tier = 3;
          else if (estimatedPrice500 >= 3) tier = 4;
          else tier = 5;
        } else if (role === 'D') {
          if (estimatedPrice500 >= 20) tier = 1;
          else if (estimatedPrice500 >= 10) tier = 2;
          else if (estimatedPrice500 >= 5) tier = 3;
          else if (estimatedPrice500 >= 2) tier = 4;
          else tier = 5;
        } else {
          if (estimatedPrice500 >= 22) tier = 1;
          else if (estimatedPrice500 >= 12) tier = 2;
          else if (estimatedPrice500 >= 5) tier = 3;
          else if (estimatedPrice500 >= 2) tier = 4;
          else tier = 5;
        }

        const budgetPercentage = parseFloat(((estimatedPrice500 / 500) * 100).toFixed(1));
        const volatility = tier === 1 ? 0.18 : tier === 2 ? 0.25 : tier === 3 ? 0.35 : 0.45;
        const minAuctionPrice500 = Math.max(1, Math.round(estimatedPrice500 * (1 - volatility)));
        const maxAuctionPrice500 = Math.max(minAuctionPrice500 + 1, Math.round(estimatedPrice500 * (1 + volatility)));

        parsedPlayers.push({
          id: `p-${targetSeason}-${idCounter++}`,
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
        return NextResponse.json({
          success: true,
          source: 'fantacalcio_official_live',
          season: targetSeason,
          players: parsedPlayers,
          count: parsedPlayers.length,
          lastUpdated: new Date().toISOString()
        });
      }
    }
  } catch (e) {
    // Fallback
  }

  return NextResponse.json({
    success: true,
    source: 'official_integrated_2026_27',
    season: targetSeason,
    players: INITIAL_PLAYERS,
    count: INITIAL_PLAYERS.length,
    lastUpdated: new Date().toISOString()
  });
}
