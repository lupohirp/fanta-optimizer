'use client';

import React from 'react';
import { Player } from '../types';
import { calculateDynamicPrice } from '../lib/optimizer';

interface PitchViewProps {
  startingXI: Player[];
  bench: Player[];
  formation: string;
  totalBudget: number;
  participants: number;
  onSelectPlayer: (player: Player) => void;
}

export const PitchView: React.FC<PitchViewProps> = ({
  startingXI,
  bench,
  formation,
  totalBudget,
  participants,
  onSelectPlayer
}) => {
  const gk = startingXI.filter(p => p.role === 'P');
  const def = startingXI.filter(p => p.role === 'D');
  const mid = startingXI.filter(p => p.role === 'C');
  const att = startingXI.filter(p => p.role === 'A');

  const renderPlayerItem = (p: Player) => {
    const price = calculateDynamicPrice(p, totalBudget, participants);
    return (
      <div 
        key={p.id} 
        className="pitch-player"
        onClick={() => onSelectPlayer(p)}
        title={`${p.name} (${p.team}) - ${price}cr - FM ${p.expectedPoints.toFixed(1)}`}
      >
        <div className={`player-jersey ${p.role}`}>
          {p.expectedPoints.toFixed(1)}
          {p.isPenaltyTaker && (
            <span style={{ 
              position: 'absolute', 
              top: '-4px', 
              right: '-4px', 
              background: '#ef4444', 
              borderRadius: '50%', 
              width: '14px', 
              height: '14px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '8px'
            }}>
              🎯
            </span>
          )}
        </div>
        <div className="pitch-player-name">{p.name}</div>
        <div className="pitch-player-stat">{price} cr</div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Field header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1rem', fontWeight: 800 }}>
          Titolari
        </span>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          Tocca un giocatore per la scheda
        </span>
      </div>

      {/* Pitch Diagram */}
      <div className="pitch-container">
        <div className="pitch-lines">
          <div className="pitch-penalty-top" />
          <div className="pitch-half-line" />
          <div className="pitch-center-circle" />
          <div className="pitch-penalty-bottom" />
        </div>

        {/* Formation badge overlaid on the pitch */}
        <span style={{
          position: 'absolute',
          top: '10px',
          right: '12px',
          zIndex: 3,
          background: 'rgba(10, 14, 23, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#fff',
          fontSize: '0.78rem',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)'
        }}>
          {formation}
        </span>

        {/* Attaccanti (Top) */}
        <div className="pitch-row">
          {att.map(renderPlayerItem)}
        </div>

        {/* Centrocampisti */}
        <div className="pitch-row">
          {mid.map(renderPlayerItem)}
        </div>

        {/* Difensori */}
        <div className="pitch-row">
          {def.map(renderPlayerItem)}
        </div>

        {/* Portiere (Bottom) */}
        <div className="pitch-row">
          {gk.map(renderPlayerItem)}
        </div>
      </div>

      {/* Bench Display */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>
          Panchina <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>({bench.length})</span>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '10px' 
        }}>
          {bench.map(p => {
            const price = calculateDynamicPrice(p, totalBudget, participants);
            return (
              <div
                key={p.id}
                onClick={() => onSelectPlayer(p)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span className={`role-badge ${p.role}`}>{p.role}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {p.team} {p.isPenaltyTaker && '• 🎯'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                    {price}cr
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    FM {p.expectedPoints.toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
