import { NextResponse } from 'next/server';
import { Player, Role, LeagueSettings } from '@/types';
import { calculateDynamicPrice } from '@/lib/optimizer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      apiKey,
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
        message: 'Nessuna API Key di Google AI Studio configurata. Puoi inserire la tua chiave gratuita nelle impostazioni o continuare con l\'ottimizzatore locale.'
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

    // Filter candidate pool to reduce token size and give Gemini the most relevant players
    const candidatesByRole: Record<Role, any[]> = {
      P: [],
      D: [],
      C: [],
      A: []
    };

    (['P', 'D', 'C', 'A'] as Role[]).forEach(role => {
      if (missingCounts[role] === 0) return;

      let pool = allPlayers.filter((p: Player) => p.role === role && !usedIds.has(p.id));

      // For goalkeepers, if a starter team is already chosen, prioritize that team
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
          // Sort by starter status and FM
          if (b.starterProb !== a.starterProb) return b.starterProb - a.starterProb;
          return b.fm - a.fm;
        })
        .slice(0, 35); // Top 35 candidates per missing role
    });

    // Build the AI Prompt
    const systemPrompt = `Sei un esperto astologo e fanta-allenatore professionista di Fantacalcio Serie A.
Il tuo compito è completare gli slot mancanti di una rosa di 25 giocatori nel rispetto del budget residuo e delle regole del Fantacalcio:

REGOLE TATTICHE FONDAMENTALI:
1. TITOLARITÀ (Certezza di voto): Scegli sempre giocatori con alta titolarità (≥80-95%) per evitare il rischio s.v.
2. RIPARTIZIONE BUDGET:
   - Attacco: ~45-55% del budget residuo
   - Centrocampo: ~25-32% del budget residuo
   - Difesa: ~15-18% del budget residuo
   - Porta: ~6-8% del budget residuo
3. BLOCCO PORTIERI: I 3 portieri devono appartenere TUTTI alla STESSA SQUADRA (titolare + riserve).
4. BUDGET RESIDUO: La somma dei prezzi dei giocatori scelti non deve superare il budget residuo (${remainingBudget} crediti).
5. SLOT MANCANTI:
   - Portieri (P): ${missingCounts.P} giocatori
   - Difensori (D): ${missingCounts.D} giocatori
   - Centrocampisti (C): ${missingCounts.C} giocatori
   - Attaccanti (A): ${missingCounts.A} giocatori

Rispondi ESCLUSIVAMENTE in formato JSON valido con questa struttura:
{
  "selectedPlayerIds": {
    "P": ["id1", ...],
    "D": ["id1", ...],
    "C": ["id1", ...],
    "A": ["id1", ...]
  },
  "tacticalReview": "Breve sintesi (2-3 frasi) in italiano sulla strategia adottata per questi acquisti"
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

    // Try Google AI Studio Gemini models (gemini-2.5-flash -> gemini-2.5-flash-lite -> gemini-2.0-flash)
    const modelList = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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
                  { text: `DATI ROSA E CANDIDATI:\n${userContent}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2,
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
        console.warn(`Attempt with ${modelName} failed, trying next model...`, err);
      }
    }

    if (!geminiResponseData || !geminiResponseData.selectedPlayerIds) {
      return NextResponse.json({
        success: false,
        error: 'AI_RESPONSE_INVALID',
        message: 'Non è stato possibile ottenere una risposta valida da Gemini AI. Verrà utilizzato l\'ottimizzatore locale.'
      });
    }

    return NextResponse.json({
      success: true,
      modelUsed: successfulModel,
      selectedPlayerIds: geminiResponseData.selectedPlayerIds,
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
