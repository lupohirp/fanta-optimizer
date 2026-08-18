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

    const totalMissingSlots = missingCounts.P + missingCounts.D + missingCounts.C + missingCounts.A;

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

    // Build the AI System Prompt with explicit dynamic status
    const systemPrompt = `Sei il miglior analista dati e stratega di Aste di Fantacalcio Serie A in Italia.
Il tuo obiettivo è completare una rosa da 25 giocatori gestendo con massima intelligenza tattica ed economica il budget residuo.

=== STATO ATTUALE DELL'ASTA (DATI DINAMICI) ===
• Budget Iniziale: ${totalBudget} crediti
• Budget Residuo Disponibile: ${remainingBudget} crediti
• Giocatori già acquistati in rosa: ${currentlyChosen.length} su 25
• Slot liberi totali da riempire adesso: ${totalMissingSlots} slot

=== NUMERO ESATTO DI CALCIATORI DA SELEZIONARE PER REPARTO ===
• Portieri (P): DEVI selezionare ESATTAMENTE ${missingCounts.P} giocatori
• Difensori (D): DEVI selezionare ESATTAMENTE ${missingCounts.D} giocatori
• Centrocampisti (C): DEVI selezionare ESATTAMENTE ${missingCounts.C} giocatori
• Attaccanti (A): DEVI selezionare ESATTAMENTE ${missingCounts.A} giocatori

=== REGOLE TATTICHE FONDAMENTALI ===
1. TITOLARITÀ (Certezza di voto): Privilegia sempre titolari affidabili (≥80-95% titolarità) per non andare in inferiorità numerica durante la stagione.
2. RIPARTIZIONE BUDGET:
   - Se mancano attaccanti, riserva la quota principale del budget residuo (${Math.round(remainingBudget * 0.45)}-${Math.round(remainingBudget * 0.55)} cr) all'attacco.
   - Completa i posti di rincalzo (3°-4° slot difensori/centrocampisti) con titolari low-cost (1-4 crediti).
3. BLOCCO PORTIERI: I 3 portieri DEVONO appartenere TUTTI alla STESSA SQUADRA (titolare + vice).
4. TETTO DI SPESA MASSIMO: La somma dei prezzi di TUTTI i giocatori che selezioni NON PUÒ SUPERARE ${remainingBudget} crediti.
5. Usa esclusivamente calciatori presenti nella lista dei candidati fornita.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido con questa struttura:
{
  "selectedPlayers": {
    "P": [{"id": "...", "name": "...", "price": 0}],
    "D": [{"id": "...", "name": "...", "price": 0}],
    "C": [{"id": "...", "name": "...", "price": 0}],
    "A": [{"id": "...", "name": "...", "price": 0}]
  },
  "tacticalReview": "Spiegazione sintetica (2-3 frasi) in italiano della strategia di spesa adottata e dei punti di forza dei nuovi innesti"
}`;

    const userContent = JSON.stringify({
      budgetResiduo: remainingBudget,
      budgetTotale: totalBudget,
      partecipanti: participants,
      strategia: strategy,
      slotMancanti: missingCounts,
      rosaAttuale: currentlyChosen.map(p => ({
        name: p.name,
        role: p.role,
        team: p.team,
        prezzoSpeso: calculateDynamicPrice(p, totalBudget, participants)
      })),
      candidatiDisponibili: candidatesByRole
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
                  { text: `DATI SITUAZIONE ASTA E CANDIDATI:\n${userContent}` }
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
