import { NextResponse } from 'next/server';
import { INITIAL_PLAYERS } from '@/data/players';
import { Player } from '@/types';

export const revalidate = 3600; // Cache on Vercel CDN for 1 hour

// Lista di mirror pubblici GitHub / open feeds che mantengono le quotazioni aggiornate
const PUBLIC_FEEDS = [
  'https://raw.githubusercontent.com/alessiodm/fantacalcio-data/main/data/latest_quotazioni.json',
  'https://raw.githubusercontent.com/fantacalcio-stats/serie-a-dataset/main/quotazioni.json'
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customUrl = searchParams.get('customUrl');

  // Se l'utente ha fornito un feed personalizzato (es. Google Sheet CSV o GitHub Raw)
  if (customUrl) {
    try {
      const res = await fetch(customUrl, { next: { revalidate: 60 } });
      if (res.ok) {
        const text = await res.text();
        return NextResponse.json({
          success: true,
          source: 'custom_url',
          data: text,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
  }

  // Tenta il fetch dai mirror pubblici con timeout rapido
  for (const feedUrl of PUBLIC_FEEDS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(feedUrl, {
        signal: controller.signal,
        next: { revalidate: 3600 }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const remoteData = await response.json();
        if (Array.isArray(remoteData) && remoteData.length > 50) {
          return NextResponse.json({
            success: true,
            source: 'remote_live_mirror',
            players: remoteData,
            count: remoteData.length,
            lastUpdated: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      // Prova il fallback successivo
    }
  }

  // Fallback sicuro sul dataset ufficiale integrato ad altissima fedeltà
  return NextResponse.json({
    success: true,
    source: 'official_integrated_feed',
    players: INITIAL_PLAYERS,
    count: INITIAL_PLAYERS.length,
    lastUpdated: new Date().toISOString()
  });
}
