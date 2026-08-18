'use client';

import React, { useMemo } from 'react';
import { Player, LeagueSettings, StrategyType, GeneratedSquad } from '../types';
import { optimizeSquad } from '../lib/optimizer';
import { STRATEGIES } from '../data/players';
import { 
  GitCompare, 
  Target, 
  Shield, 
  Flame, 
  Crosshair, 
  Sparkles, 
  CheckCircle2
} from 'lucide-react';

interface SquadComparatorProps {
  allPlayers: Player[];
  settings: LeagueSettings;
  onSelectPlayer: (player: Player) => void;
}

export const SquadComparator: React.FC<SquadComparatorProps> = ({
  allPlayers,
  settings,
  onSelectPlayer
}) => {
  // Generate 3 sample strategies for comparison
  const comparisonStrategies: StrategyType[] = ['balanced', 'heavy_attack', 'defense_modifier'];

  const comparedSquads = useMemo(() => {
    return comparisonStrategies.map(strategy => {
      const customSettings: LeagueSettings = {
        ...settings,
        strategy
      };
      return optimizeSquad(allPlayers, customSettings, []);
    });
  }, [allPlayers, settings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: 'var(--radius-md)', 
            background: 'rgba(59, 130, 246, 0.2)', 
            color: '#60a5fa', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <GitCompare size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Confronto Strategie d'Asta</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Metti a confronto 3 approcci diversi calcolati con il tuo budget attuale di <strong style={{ color: 'var(--accent-gold)' }}>{settings.totalBudget} crediti</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Grid of 3 compared strategies */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', 
        gap: '20px' 
      }}>
        {comparedSquads.map((squad) => {
          const stratInfo = STRATEGIES[squad.strategy];
          const topForward = squad.players.filter(p => p.role === 'A').sort((a, b) => b.expectedPoints - a.expectedPoints)[0];
          const topMidfielder = squad.players.filter(p => p.role === 'C').sort((a, b) => b.expectedPoints - a.expectedPoints)[0];
          const topDefender = squad.players.filter(p => p.role === 'D').sort((a, b) => b.expectedPoints - a.expectedPoints)[0];

          return (
            <div key={squad.strategy} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>
                  {stratInfo.name}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {stratInfo.description}
                </p>
              </div>

              {/* Stat Highlights */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="stat-widget" style={{ padding: '10px 12px' }}>
                  <span className="stat-widget-label">FM 11 Titolare</span>
                  <span className="stat-widget-value" style={{ fontSize: '1.2rem', color: 'var(--accent-emerald-light)' }}>
                    {squad.projectedFantaPoints} pt
                  </span>
                </div>

                <div className="stat-widget" style={{ padding: '10px 12px' }}>
                  <span className="stat-widget-label">Gol Stimati</span>
                  <span className="stat-widget-value" style={{ fontSize: '1.2rem', color: '#f87171' }}>
                    ~{squad.projectedGoals}
                  </span>
                </div>

                <div className="stat-widget" style={{ padding: '10px 12px' }}>
                  <span className="stat-widget-label">Rigoristi in rosa</span>
                  <span className="stat-widget-value" style={{ fontSize: '1.2rem', color: '#60a5fa' }}>
                    {squad.penaltyTakersCount}
                  </span>
                </div>

                <div className="stat-widget" style={{ padding: '10px 12px' }}>
                  <span className="stat-widget-label">Spesa Attacco</span>
                  <span className="stat-widget-value" style={{ fontSize: '1.2rem', color: 'var(--accent-gold)' }}>
                    {squad.budgetPercentages.A}%
                  </span>
                </div>
              </div>

              {/* Ripartizione Spesa */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  RIPARTIZIONE CREDITI
                </div>
                <div style={{ height: '8px', width: '100%', borderRadius: '4px', background: 'var(--bg-input)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${squad.budgetPercentages.P}%`, background: '#f59e0b' }} />
                  <div style={{ width: `${squad.budgetPercentages.D}%`, background: '#10b981' }} />
                  <div style={{ width: `${squad.budgetPercentages.C}%`, background: '#3b82f6' }} />
                  <div style={{ width: `${squad.budgetPercentages.A}%`, background: '#ef4444' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  <span>P: {squad.budgetBreakdown.P}cr</span>
                  <span>D: {squad.budgetBreakdown.D}cr</span>
                  <span>C: {squad.budgetBreakdown.C}cr</span>
                  <span>A: {squad.budgetBreakdown.A}cr</span>
                </div>
              </div>

              {/* Key Leaders in this squad */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  UOMINI CHIAVE DELLA ROSA
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {topForward && (
                    <div 
                      onClick={() => onSelectPlayer(topForward)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                        <span className="role-badge A">A</span>
                        <strong>{topForward.name}</strong> ({topForward.team})
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald-light)', fontFamily: 'var(--font-mono)' }}>FM {topForward.expectedPoints.toFixed(1)}</span>
                    </div>
                  )}

                  {topMidfielder && (
                    <div 
                      onClick={() => onSelectPlayer(topMidfielder)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                        <span className="role-badge C">C</span>
                        <strong>{topMidfielder.name}</strong> ({topMidfielder.team})
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald-light)', fontFamily: 'var(--font-mono)' }}>FM {topMidfielder.expectedPoints.toFixed(1)}</span>
                    </div>
                  )}

                  {topDefender && (
                    <div 
                      onClick={() => onSelectPlayer(topDefender)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                        <span className="role-badge D">D</span>
                        <strong>{topDefender.name}</strong> ({topDefender.team})
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald-light)', fontFamily: 'var(--font-mono)' }}>FM {topDefender.expectedPoints.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
