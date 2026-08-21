'use client';

import React from 'react';
import { Player } from '../types';
import { ConsensusReport } from '../lib/consensus';
import { Users } from 'lucide-react';

interface ConsensusPanelProps {
  report: ConsensusReport;
  onSelectPlayer: (player: Player) => void;
}

const pct = (n: number) => n.toFixed(1).replace('.', ',');

export const ConsensusPanel: React.FC<ConsensusPanelProps> = ({ report, onSelectPlayer }) => {
  // Senza dati di diffusione non c'è niente di sensato da dire
  if (report.covered === 0) return null;

  return (
    <div className="glass-card" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Users size={17} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Chi ti contenderanno</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {report.contestedCount > 0
                ? `${report.contestedCount} ${report.contestedCount === 1 ? 'acquisto finisce' : 'acquisti finiscono'} nel mirino di tutti, per ${report.contestedSpend} crediti. Accanto, chi rende quanto loro senza guerra di rilanci.`
                : 'Nessuno dei tuoi obiettivi è particolarmente battuto: passi sotto i radar'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '18px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
              {report.overlapWithMostBought}<span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/25</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>fra i più comprati</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
              {pct(report.weightedOwnership)}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>diffusione media</div>
          </div>
        </div>
      </div>

      {report.contested.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {report.contested.map(pick => (
            <div
              key={pick.player.id}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`role-badge ${pick.player.role}`}>{pick.player.role}</span>
                <span
                  onClick={() => onSelectPlayer(pick.player)}
                  style={{ fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  {pick.player.name}
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{pick.player.team}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: '10px', fontSize: '0.76rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#fbbf24' }}>{pct(pick.ownership)}% rose</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{pick.price} cr</span>
                </span>
              </div>

              {pick.alternatives.length > 0 ? (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '2px' }}>invece di lui</span>
                    {pick.alternatives.map(alt => (
                      <span
                        key={alt.player.id}
                        onClick={() => onSelectPlayer(alt.player)}
                        title={`${alt.player.name}: ${pct(alt.ownership)}% delle rose, ${alt.price} crediti, ${alt.rankGap <= 0 ? 'stessa fascia o meglio' : alt.rankGap + ' posizioni sotto'} nel ruolo`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '4px 9px',
                          fontSize: '0.76rem',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{alt.player.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {alt.price} cr
                        </span>
                        {alt.saves > 0 && (
                          <span style={{ color: 'var(--accent-emerald-light)', fontFamily: 'var(--font-mono)' }}>
                            -{alt.saves}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Nessuno rende quanto lui a meno: se lo vuoi, mettilo in conto.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
