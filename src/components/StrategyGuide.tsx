'use client';

import React from 'react';
import { 
  BookOpen, 
  Lightbulb, 
  ShieldCheck, 
  Crosshair, 
  AlertTriangle, 
  PieChart,
  DollarSign
} from 'lucide-react';

export const StrategyGuide: React.FC = () => {
  const guideSections = [
    {
      icon: <PieChart size={20} style={{ color: 'var(--accent-gold)' }} />,
      title: '1. Le Percentuali Auree del Budget',
      content: `
        La gestione del budget è l'80% del successo in un'asta. Una suddivisione standard consigliata su 500 crediti è:
        • **Portieri (6% - 8%):** ~30-40 crediti. Meglio prendere il blocco di una big (titolare + riserva) oppure un'ottima alternanza casa/trasferta di due squadre medie.
        • **Difensori (14% - 20%):** ~70-100 crediti. Se non c'è modificatore, investi il minimo indispensabile (1-2 top e tanti regolaristi da 6).
        • **Centrocampisti (25% - 32%):** ~130-160 crediti. Il reparto che vince i campionati: cerca centrocampisti che giocano esterni d'attacco o trequartisti con bonus costanti.
        • **Attaccanti (45% - 55%):** ~230-275 crediti. Riserva almeno la metà del budget per assicurarti il bomber da 18+ gol e due solidi comprimari da doppia cifra.
      `
    },
    {
      icon: <ShieldCheck size={20} style={{ color: 'var(--accent-emerald-light)' }} />,
      title: '2. Modificatore Difesa: Quando Conviene?',
      content: `
        Il modificatore difesa scatta quando schieri almeno 4 difensori e calcola la media tra portiere e i 3 migliori difensori:
        • Media ≥ 6.00: **+1 punto**
        • Media ≥ 6.25: **+2 punti**
        • Media ≥ 6.50: **+3 punti**
        • Media ≥ 7.00: **+6 punti**
        
        *Consiglio Pro:* Attiva la strategia "Modificatore Difesa" nell'app solo se la tua lega assegna bonus a partire da 6.00. Conviene comprare 1 Top assoluto da 6.5+ (es. Dimarco, Bremer, Theo), 2 semitop costanti e 2 titolari di squadre difensive.
      `
    },
    {
      icon: <Crosshair size={20} style={{ color: '#60a5fa' }} />,
      title: '3. La Regola dei Rigoristi',
      content: `
        I calci di rigore valgono +3 punti ciascuno. In un campionato di 38 giornate, un rigorista garantisce tra i 4 e gli 8 gol "extra" che possono ribaltare le partite.
        • Punta ad avere in rosa **almeno 2 o 3 rigoristi ufficiali** tra centrocampo e attacco (es. Calhanoglu, Zaccagni, Vlahovic, Gudmundsson, Lautaro).
        • Se un centrocampista batte i rigori, il suo valore raddoppia rispetto a una mezzala da 3 gol su azione!
      `
    },
    {
      icon: <AlertTriangle size={20} style={{ color: '#f87171' }} />,
      title: '4. I 5 Errori Più Comuni all\'Asta',
      content: `
        **1. Fissarsi su un solo giocatore:** Se il prezzo del tuo pupillo supera del 30% la stima, lascialo andare e usa il "Piano B".
        **2. Svuotare il budget sui primi chiamati:** Conserva sempre crediti per la seconda metà dell'asta, quando i rivali non possono più rilanciare.
        **3. Comprare troppi giocatori della stessa squadra:** Rischi la disfatta nelle giornate no o nei turni contro le big.
        **4. Sottovalutare i panchinari a 1 credito:** I tappabuchi devono essere titolari certi al 90% (anche se prendono 5.5 o 6), per non giocare mai in 10.
        **5. Non studiare gli incroci di calendario dei portieri:** Controlla sempre che non giochino entrambi in trasferta contro Inter, Juve o Napoli.
      `
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: 'var(--radius-md)', 
            background: 'rgba(16, 185, 129, 0.2)', 
            color: 'var(--accent-emerald-light)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Guida Strategica & Consigli per l'Asta</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Metodologie e trucchi matematici per massimizzare la resa dei tuoi crediti
            </p>
          </div>
        </div>
      </div>

      {/* Da dove arrivano i prezzi */}
      <div className="glass-card">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Da dove arrivano i prezzi</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '10px' }}>
          I crediti che vedi accanto a ogni giocatore non sono la quotazione del listino, ma il{' '}
          <strong style={{ color: 'var(--text-primary)' }}>prezzo medio realmente pagato nelle aste</strong>{' '}
          di migliaia di leghe. Le due cose sono molto diverse: un difensore quotato 32 può
          andarsene per 64 crediti, e un nuovo acquisto senza storico in Serie A può valere dieci
          volte la sua quotazione.
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '10px' }}>
          I prezzi vengono rilevati su quattro formati di lega (8 o 10 squadre, 350 o 500 crediti) e
          adattati al formato della tua: più squadre in lega significa più concorrenza e prezzi più
          alti, un budget più grande significa che ogni singolo giocatore pesa percentualmente meno.
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          L&apos;etichetta <strong style={{ color: 'var(--accent-emerald-light)' }}>Affare</strong> o{' '}
          <strong style={{ color: '#f87171' }}>Caro</strong> nasce dal confronto fra due classifiche:
          quanto rende un giocatore rispetto agli altri del suo ruolo, e quanto il mercato paga chi
          occupa quella posizione. Se sei l&apos;ottavo attaccante per rendimento ma costi come il
          venticinquesimo, sei un affare.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {guideSections.map((sec, idx) => (
          <div key={idx} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              {sec.icon}
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{sec.title}</h3>
            </div>

            <div style={{ 
              fontSize: '0.86rem', 
              color: 'var(--text-secondary)', 
              lineHeight: 1.6, 
              whiteSpace: 'pre-line' 
            }}>
              {sec.content.trim()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
