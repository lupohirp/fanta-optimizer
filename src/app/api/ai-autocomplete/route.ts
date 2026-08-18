import { NextResponse } from 'next/server';
import { Player, Role, LeagueSettings } from '@/types';
import { calculateDynamicPrice } from '@/lib/optimizer';

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

function findMatchingPlayer(idOrName: string, role: Role, allPlayers: Player[]): Player | undefined {
  if (!idOrName) return undefined;
  const clean = idOrName.trim();
  const norm = normalize(clean);

  // 1. Direct ID match
  let p = allPlayers.find(pl => pl.id === clean && pl.role === role);
  if (p) return p;

  // 2. Direct name match
  p = allPlayers.find(pl => pl.role === role && pl.name.toLowerCase() === clean.toLowerCase());
  if (p) return p;

  // 3. Normalized name match
  p = allPlayers.find(pl => pl.role === role && normalize(pl.name) === norm);
  if (p) return p;

  // 4. Surname match
  const surname = normalize(clean.split(' ')[0]);
  if (surname.length >= 3) {
    p = allPlayers.find(pl => pl.role === role && normalize(pl.name.split(' ')[0]) === surname);
    if (p) return p;
  }

  // 5. Fallback without role constraint if unique
  return allPlayers.find(pl => pl.id === clean || normalize(pl.name) === norm);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      apiKey,
      model = 'gemini-3.5-flash-lite',
      selectedSlots, 
      remainingBudget, 
      totalBudget, 
      participants = 8, 
      strategy = 'balanced',
      allPlayers 
    } = body;

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return NextResponse.json({
        success: false,
        error: 'NO_API_KEY',
        message: 'Nessuna API Key di Google AI Studio configurata nel file .env.local (GEMINI_API_KEY).'
      });
    }

    // Determine missing slots count per role
    const missingCounts: Record<Role, number> = {
      P: selectedSlots.P.filter((p: any) => p === null).length,
      D: selectedSlots.D.filter((p: any) => p === null).length,
      C: selectedSlots.C.filter((p: any) => p === null).length,
      A: selectedSlots.A.filter((p: any) => p === null).length,
    };

    const currentlyChosen: Player[] = [];
    ['P', 'D', 'C', 'A'].forEach(r => {
      selectedSlots[r as Role].forEach((p: Player | null) => {
        if (p) currentlyChosen.push(p);
      });
    });

    const usedIds = new Set(currentlyChosen.map(p => p.id));
    const keeperTeam = selectedSlots.P.find((p: any) => p !== null)?.team;

    // Filter candidate pool to give Gemini the most relevant players
    const candidatesByRole: Record<Role, any[]> = {
      P: [],
      D: [],
      C: [],
      A: []
    };

    (['P', 'D', 'C', 'A'] as Role[]).forEach(role => {
      if (missingCounts[role] === 0) return;

      let pool = allPlayers.filter((p: Player) => p.role === role && !usedIds.has(p.id));

      if (role === 'P' && keeperTeam) {
        const sameTeam = pool.filter((p: Player) => p.team === keeperTeam);
        if (sameTeam.length > 0) pool = sameTeam;
      }

      candidatesByRole[role] = pool
        .map((p: Player) => ({
          id: p.id,
          name: p.name,
          team: p.team,
          role: p.role,
          price: calculateDynamicPrice(p, totalBudget, participants),
          fm: p.expectedPoints,
          starterProb: p.starterProbability,
          isPenaltyTaker: p.isPenaltyTaker
        }))
        .filter((c: any) => c.price <= remainingBudget)
        .sort((a: any, b: any) => {
          if (b.starterProb !== a.starterProb) return b.starterProb - a.starterProb;
          return b.fm - a.fm;
        })
        .slice(0, 40);
    });

    // Build the AI Prompt
    const systemPrompt = `Sei un esperto astologo e fanta-allenatore professionista di Fantacalcio Serie A.
Il tuo compito è completare ESATTAMENTE il numero di slot vuoti richiesti per ciascun reparto, selezionando i migliori calciatori dalla lista dei candidati fornita.

REGOLE OBBLIGATORIE:
1. QUANTITÀ ESATTA DI GIOCATORI DA SCEGLIERE:
   - Portieri (P): devi scegliere ESATTAMENTE ${missingCounts.P} giocatori
   - Difensori (D): devi scegliere ESATTAMENTE ${missingCounts.D} giocatori
   - Centrocampisti (C): devi scegliere ESATTAMENTE ${missingCounts.C} giocatori
   - Attaccanti (A): devi scegliere ESATTAMENTE ${missingCounts.A} giocatori

2. TITOLARITÀ (Certezza di voto): Scegli sempre giocatori con titolarità alta (≥80-95%) per evitare s.v.
3. BLOCCO PORTIERI: I 3 portieri devono essere TUTTI della STESSA SQUADRA.
4. BUDGET RESIDUO: La somma dei prezzi di TUTTI i giocatori scelti non deve superare ${remainingBudget} crediti.
5. Usa ESATTAMENTE gli ID e i NOMI presenti nella lista dei candidati.

Rispondi ESCLUSIVAMENTE in JSON valido con questa struttura:
{
  "selectedPlayers": {
    "P": [{"id": "...", "name": "...", "price": 0}],
    "D": [{"id": "...", "name": "...", "price": 0}],
    "C": [{"id": "...", "name": "...", "price": 0}],
    "A": [{"id": "...", "name": "...", "price": 0}]
  },
  "tacticalReview": "Breve commento tattico (2-3 frasi) in italiano che spiega la composizione della rosa"
}`;

    const userContent = JSON.stringify({
      remainingBudget,
      totalBudget,
      strategy,
      missingCounts,
      currentlyChosen: currentlyChosen.map(p => ({
        name: p.name,
        role: p.role,
        team: p.team,
        price: calculateDynamicPrice(p, totalBudget, participants)
      })),
      candidates: candidatesByRole
    });

    // Prioritize user selected model
    const baseList = [
      model,
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ];
    const modelList = Array.from(new Set(baseList));

    let geminiResponseData: any = null;
    let successfulModel = '';

    for (const modelName of modelList) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: systemPrompt },
                  { text: `DATI CANDIDATI ED ESIGENZE ROSA:\n${userContent}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.15,
              responseMimeType: 'application/json'
            }
          })
        });

        if (res.ok) {
          const json = await res.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            geminiResponseData = JSON.parse(rawText);
            successfulModel = modelName;
            break;
          }
        }
      } catch (err) {
        console.warn(`Attempt with ${modelName} failed, trying next fallback model...`, err);
      }
    }

    if (!geminiResponseData) {
      return NextResponse.json({
        success: false,
        error: 'AI_RESPONSE_INVALID',
        message: 'Non è stato possibile ottenere una risposta valida da Gemini AI. Verrà utilizzato l\'ottimizzatore locale.'
      });
    }

    // Extract players list by role from Gemini output
    const filledByRole: Record<Role, Player[]> = {
      P: [],
      D: [],
      C: [],
      A: []
    };

    const selObj = geminiResponseData.selectedPlayers || geminiResponseData.selectedPlayerIds || {};

    (['P', 'D', 'C', 'A'] as Role[]).forEach(role => {
      const list = selObj[role] || [];
      list.forEach((item: any) => {
        const idOrName = typeof item === 'string' ? item : (item.id || item.name);
        const match = findMatchingPlayer(idOrName, role, allPlayers);
        if (match && !usedIds.has(match.id)) {
          filledByRole[role].push(match);
          usedIds.add(match.id);
        }
      });
    });

    return NextResponse.json({
      success: true,
      modelUsed: successfulModel,
      filledPlayers: filledByRole,
      tacticalReview: geminiResponseData.tacticalReview || 'Rosa completata con successo con Google Gemini AI!'
    });

  } catch (error: any) {
    console.error('Error in AI Autocomplete API:', error);
    return NextResponse.json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Errore interno del server'
    });
  }
}
