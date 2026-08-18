import { NextResponse } from 'next/server';
import { Player, Role, LeagueSettings } from '@/types';
import { calculateDynamicPrice } from '@/lib/optimizer';

interface JudgeRequest {
  players: Player[];
  settings: LeagueSettings;
  model?: string;
}

export async function POST(request: Request) {
  try {
    const body: JudgeRequest = await request.json();
    const { players = [], settings, model = 'gemini-3.5-flash-lite' } = body;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!players || players.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'NO_PLAYERS',
        message: 'Nessun giocatore fornito per la valutazione.'
      });
    }

    const totalBudget = settings.totalBudget || 500;
    const participants = settings.participants || 8;

    const pPlayers = players.filter(p => p.role === 'P');
    const dPlayers = players.filter(p => p.role === 'D');
    const cPlayers = players.filter(p => p.role === 'C');
    const aPlayers = players.filter(p => p.role === 'A');

    const totalSpent = players.reduce((s, p) => s + calculateDynamicPrice(p, totalBudget, participants), 0);
    const avgStarter = Math.round(players.reduce((s, p) => s + (p.starterProbability || 85), 0) / players.length);
    const totalGoals = players.reduce((s, p) => s + (p.expectedGoals || 0), 0);
    const totalAssists = players.reduce((s, p) => s + (p.expectedAssists || 0), 0);
    const penaltyTakers = players.filter(p => p.isPenaltyTaker);

    // Compute heuristic fallback evaluation in case AI key is missing or fails
    const calcDeptGrade = (roleList: Player[], targetCount: number, expFmMin: number): { grade: number; review: string } => {
      if (roleList.length === 0) return { grade: 4.0, review: 'Reparto non ancora completato.' };
      const avgFm = roleList.reduce((s, p) => s + p.expectedPoints, 0) / roleList.length;
      const starterAvg = roleList.reduce((s, p) => s + p.starterProbability, 0) / roleList.length;
      
      let base = 6.0;
      if (avgFm >= expFmMin + 0.8) base += 2.5;
      else if (avgFm >= expFmMin + 0.4) base += 1.8;
      else if (avgFm >= expFmMin) base += 1.0;
      else base -= 0.5;

      if (starterAvg >= 90) base += 0.8;
      else if (starterAvg < 75) base -= 1.0;

      const clamped = Math.min(9.8, Math.max(5.0, parseFloat(base.toFixed(1))));
      return {
        grade: clamped,
        review: `FM Media reparto ${avgFm.toFixed(2)}, titolarità media ${Math.round(starterAvg)}%.`
      };
    };

    const pGrade = calcDeptGrade(pPlayers, 3, 5.8);
    const dGrade = calcDeptGrade(dPlayers, 8, 6.0);
    const cGrade = calcDeptGrade(cPlayers, 8, 6.4);
    const aGrade = calcDeptGrade(aPlayers, 6, 7.0);

    const overallScore = parseFloat(((pGrade.grade * 0.15 + dGrade.grade * 0.20 + cGrade.grade * 0.30 + aGrade.grade * 0.35)).toFixed(1));

    const fallbackEvaluation = {
      overallRating: overallScore,
      titleBadge: overallScore >= 8.5 ? '🏆 Candidata al Titolo' : overallScore >= 7.8 ? '⭐ Zona Champions' : overallScore >= 7.0 ? '🎯 Squadra da Podio' : '⚡ Outsider / Da Perfezionare',
      projectedFinish: overallScore >= 8.5 ? '1° - 2° Posto' : overallScore >= 7.8 ? '2° - 4° Posto' : overallScore >= 7.0 ? '4° - 6° Posto' : 'Metà Classifica',
      departmentGrades: {
        P: { grade: pGrade.grade, review: `Blocco portieri (${pPlayers.map(p => p.name).join(', ') || 'Nessuno'}) con affidabilità e titolarità complessiva solida.` },
        D: { grade: dGrade.grade, review: `Difesa con FM ${dGrade.review} e buona predisposizione ai voti da modificatore.` },
        C: { grade: cGrade.grade, review: `Centrocampo dinamico con propensione al bonus e ${players.filter(p => p.role === 'C' && p.isPenaltyTaker).length} rigoristi.` },
        A: { grade: aGrade.grade, review: `Attacco calibrato con circa ~${totalGoals} gol complessivi previsti per la stagione.` }
      },
      strengths: [
        `Elevata certezza di voto complessiva: titolarità media ${avgStarter}%`,
        `Presenza di ${penaltyTakers.length} rigoristi designati in rosa (${penaltyTakers.map(p => p.name).slice(0, 3).join(', ')})`,
        `Ripartizione del budget coerente con la strategia ${settings.strategy || 'bilanciata'}`
      ],
      weaknesses: [
        players.length < 25 ? `Rosa non ancora a 25 elementi (${players.length}/25 slot)` : `Attenzione alle giornate di turnover europeo per i titolari delle big`
      ],
      auctionTip: `Mantieni sempre 1-2 crediti di scorta per gli slot finali e monitora le gerarchie sui calci da fermo durante la stagione.`
    };

    // If Gemini key is available, query Gemini 3.5 for a bespoke professional scouting report
    if (geminiKey) {
      try {
        const systemPrompt = `Sei il più autorevole e carismatico fanta-giornalista e analista tattico di Fantacalcio Serie A in Italia (stile pagellone d'asta e scouting report).
Devi analizzare dettagliatamente la rosa di un fanta-allenatore e dare un giudizio esperto, autorevole, appassionato e competente.

Valuta:
1. Solidità della porta e blocco squadra
2. Difesa (modificatore, bonus assist/gol dei terzini, titolarità)
3. Centrocampo (bonus pesanti, rigoristi, regolarità voto)
4. Attacco (distribuzione dei gol, tandem 1°-2° slot, rischio rotazioni)
5. Voto Globale (da 1.0 a 10.0 con 1 decimale, es. 8.5)
6. Voti per i 4 reparti P, D, C, A con commento specifico
7. 3 Punti di Forza (Strengths) concreti con nomi dei giocatori
8. 2 Aree di Attenzione / Rischi (Weaknesses)
9. 1 Consiglio Strategico per l'Asta o il mercato di riparazione (Auction Tip)

Rispondi ESCLUSIVAMENTE con un JSON valido con questa struttura:
{
  "overallRating": 8.5,
  "titleBadge": "🏆 Candidata allo Scudetto",
  "projectedFinish": "1° - 2° Posto",
  "departmentGrades": {
    "P": { "grade": 8.0, "review": "Spiegazione sintetica del reparto portieri" },
    "D": { "grade": 7.5, "review": "Spiegazione sintetica del reparto difensori" },
    "C": { "grade": 8.5, "review": "Spiegazione sintetica del reparto centrocampo" },
    "A": { "grade": 9.0, "review": "Spiegazione sintetica del reparto attacco" }
  },
  "strengths": ["Punto 1", "Punto 2", "Punto 3"],
  "weaknesses": ["Rischio 1", "Rischio 2"],
  "auctionTip": "Consiglio tattico per completare o gestire la rosa"
}`;

        const userContent = JSON.stringify({
          totaleBudget: totalBudget,
          partecipanti: participants,
          modificatoreDifesa: settings.defenseModifier,
          totaleSpeso: totalSpent,
          totaleGiocatori: players.length,
          titolaritaMedia: avgStarter,
          golStimatiTotali: totalGoals,
          assistStimatiTotali: totalAssists,
          rigoristi: penaltyTakers.map(p => `${p.name} (${p.team}, ${p.role})`),
          rosaCompleta: {
            P: pPlayers.map(p => ({ nome: p.name, squadra: p.team, fm: p.expectedPoints, titolarita: p.starterProbability, prezzo: calculateDynamicPrice(p, totalBudget, participants) })),
            D: dPlayers.map(p => ({ nome: p.name, squadra: p.team, fm: p.expectedPoints, titolarita: p.starterProbability, prezzo: calculateDynamicPrice(p, totalBudget, participants) })),
            C: cPlayers.map(p => ({ nome: p.name, squadra: p.team, fm: p.expectedPoints, titolarita: p.starterProbability, prezzo: calculateDynamicPrice(p, totalBudget, participants), rigorista: p.isPenaltyTaker })),
            A: aPlayers.map(p => ({ nome: p.name, squadra: p.team, fm: p.expectedPoints, titolarita: p.starterProbability, prezzo: calculateDynamicPrice(p, totalBudget, participants), gol: p.expectedGoals, rigorista: p.isPenaltyTaker }))
          }
        });

        const modelList = [model, 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
        for (const m of Array.from(new Set(modelList))) {
          try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`;
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: systemPrompt }, { text: `DATI ROSA DA GIUDICARE:\n${userContent}` }] }],
                generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
              })
            });

            if (res.ok) {
              const json = await res.json();
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const parsed = JSON.parse(text);
                if (parsed.overallRating && parsed.departmentGrades) {
                  return NextResponse.json({
                    success: true,
                    modelUsed: m,
                    evaluation: parsed
                  });
                }
              }
            }
          } catch (e) {
            console.warn(`Model ${m} failed for judging squad, trying fallback...`, e);
          }
        }
      } catch (err) {
        console.error('Gemini judging error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      modelUsed: 'Local Heuristic Engine',
      evaluation: fallbackEvaluation
    });

  } catch (error: any) {
    console.error('Error in judge-squad API:', error);
    return NextResponse.json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Errore interno nel giudicare la rosa'
    });
  }
}
