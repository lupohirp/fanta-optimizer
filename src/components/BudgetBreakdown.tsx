'use client';

import React from 'react';
import { GeneratedSquad, Role } from '../types';
import { 
  Coins, 
  Target, 
  Flame, 
  Sparkles, 
  Crosshair,
  UserCheck
} from 'lucide-react';

interface BudgetBreakdownProps {
  squad: GeneratedSquad;
  totalBudget: number;
}

export const BudgetBreakdown: React.FC<BudgetBreakdownProps> = ({
  squad,
  totalBudget
}) => {
  const roles: { role: Role; label: string; color: string; bg: string }[] = [
    { role: 'P', label: 'Portieri (3)', color: '#fbbf24', bg: 'var(--role-p-bg)' },
    { role: 'D', label: 'Difensori (8)', color: '#34d399', bg: 'var(--role-d-bg)' },
    { role: 'C', label: 'Centrocampisti (8)', color: '#60a5fa', bg: 'var(--role-c-bg)' },
    { role: 'A', label: 'Attaccanti (6)', color: '#f87171', bg: 'var(--role-a-bg)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
      {/* Top summary stat widgets */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
        gap: '12px' 
      }}>
        <div className="stat-widget">
          <div className="stat-widget-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coins size={14} style={{ color: 'var(--accent-gold)' }} />
            <span>Spesa / Budget</span>
          </div>
          <div className="stat-widget-value">
            {squad.budgetSpent} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {totalBudget} cr</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald-light)' }}>
            {squad.budgetRemaining} crediti avanzati
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-widget-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={14} style={{ color: 'var(--accent-emerald-light)' }} />
            <span>FM 11 Titolare</span>
          </div>
          <div className="stat-widget-value" style={{ color: 'var(--accent-emerald-light)' }}>
            {squad.projectedFantaPoints} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pt/g</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            FantaMedia attesa a giornata
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-widget-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={14} style={{ color: '#f87171' }} />
            <span>Gol Previsti</span>
          </div>
          <div className="stat-widget-value">
            ~{squad.projectedGoals} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>gol</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            + ~{squad.projectedAssists} assist previsti
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-widget-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Crosshair size={14} style={{ color: '#60a5fa' }} />
            <span>Rigoristi in Rosa</span>
          </div>
          <div className="stat-widget-value">
            {squad.penaltyTakersCount} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>tiratori</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Bonus dal dischetto assicurati
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-widget-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={14} style={{ color: 'var(--accent-gold)' }} />
            <span>Titolarità Media</span>
          </div>
          <div className="stat-widget-value">
            {squad.averageStarterProbability}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Rischio s.v. minimo
          </div>
        </div>
      </div>

      {/* Role percentage distribution cards */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>RIPARTIZIONE CREDITI PER REPARTO</span>
          <span className="font-mono">{squad.budgetSpent} / {totalBudget} cr</span>
        </div>

        {/* Multi-segment stacked bar */}
        <div style={{ 
          height: '10px', 
          width: '100%', 
          borderRadius: '5px', 
          background: 'var(--bg-input)', 
          overflow: 'hidden', 
          display: 'flex', 
          marginBottom: '14px' 
        }}>
          <div style={{ width: `${squad.budgetPercentages.P}%`, background: '#f59e0b', transition: 'width 0.3s' }} title={`Porta: ${squad.budgetPercentages.P}%`} />
          <div style={{ width: `${squad.budgetPercentages.D}%`, background: '#10b981', transition: 'width 0.3s' }} title={`Difesa: ${squad.budgetPercentages.D}%`} />
          <div style={{ width: `${squad.budgetPercentages.C}%`, background: '#3b82f6', transition: 'width 0.3s' }} title={`Centrocampo: ${squad.budgetPercentages.C}%`} />
          <div style={{ width: `${squad.budgetPercentages.A}%`, background: '#ef4444', transition: 'width 0.3s' }} title={`Attacco: ${squad.budgetPercentages.A}%`} />
        </div>

        {/* 4 Roles info grids */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px' 
        }}>
          {roles.map(({ role, label, color, bg }) => {
            const spent = squad.budgetBreakdown[role];
            const pct = squad.budgetPercentages[role];
            return (
              <div 
                key={role}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`role-badge ${role}`}>{role}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{label}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', fontFamily: 'var(--font-mono)', color }}>
                    {spent} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>cr</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {pct}% del totale
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
