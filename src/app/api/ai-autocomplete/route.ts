import { NextResponse } from 'next/server';
import { Role } from '@/types';

interface ReviewPlayer {
  name: string;
  role: Role;
  team: string;
  price: number;
  fm: number;
  starterProb: number;
  isPenaltyTaker: boolean;
  isNew: boolean;
}

/**
 * Genera la review tattica di una rosa GIÀ completata dall'ottimizzatore locale.
 * La selezione dei giocatori non passa più da Gemini: un LLM è inadatto a
 * risolvere il vincolo combinatorio budget/slot, mentre è ottimo a commentare.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      apiKey,
      model = 'gemini-3.5-flash-lite',
      totalBudget,
      participants = 8,
      strategy = 'balanced',
      squad = []
    } = body as {
      apiKey?: string;
      model?: string;
      totalBudget: number;
      participants?: number;
      strategy?: string;
      squad: ReviewPlayer[];
    };

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return NextResponse.json({
        success: false,
        error: 'NO_API_KEY',
        message: 'Nessuna API Key di Google AI Studio configurata nel file .env.local (GEMINI_API_KEY).'
      });
    }

    if (!Array.isArray(squad) || squad.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'EMPTY_SQUAD',
        message: 'Nessuna rosa da recensire.'
      });
    }

    const totalSpent = squad.reduce((sum, p) => sum + (p.price || 0), 0);
    const newSignings = squad.filter(p => p.isNew);

    const systemPrompt = `Sei il miglior analista dati e stratega di Aste di Fantacalcio Serie A in Italia.
Ti viene fornita una rosa da 25 giocatori GIÀ COMPLETATA da un motore di ottimizzazione matematica.
NON devi selezionare o sostituire giocatori: devi scrivere una breve review tattica in italiano.

La review (3-4 frasi) deve coprire:
1. Un giudizio sui nuovi innesti (campo "isNew": true) e su come si integrano con i giocatori già presenti.
2. L'equilibrio dei reparti e della spesa rispetto alla strategia "${strategy}".
3. Un rischio concreto da tenere d'occhio (titolarità, dipendenza da una squadra, reparto corto).

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido con questa struttura:
{ "tacticalReview": "..." }`;

    const userContent = JSON.stringify({
      budgetTotale: totalBudget,
      budgetSpeso: totalSpent,
      partecipanti: participants,
      strategia: strategy,
      nuoviInnesti: newSignings.map(p => p.name),
      rosa: squad
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
                  { text: `ROSA DA RECENSIRE:\n${userContent}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.5,
              responseMimeType: 'application/json'
            }
          })
        });

        if (res.ok) {
          const json = await res.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const review = typeof parsed === 'string' ? parsed : parsed.tacticalReview;
            if (review) {
              return NextResponse.json({
                success: true,
                modelUsed: modelName,
                tacticalReview: review
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Attempt with ${modelName} failed, trying next fallback model...`, err);
      }
    }

    return NextResponse.json({
      success: false,
      error: 'AI_RESPONSE_INVALID',
      message: 'Non è stato possibile ottenere una review valida da Gemini AI.'
    });

  } catch (error: unknown) {
    console.error('Error in AI Tactical Review API:', error);
    return NextResponse.json({
      success: false,
      error: 'SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Errore interno del server'
    });
  }
}
