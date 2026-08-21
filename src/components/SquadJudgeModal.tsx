'use client';

import React from 'react';
import { Player, Role, LeagueSettings } from '../types';
import { 
  Trophy, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Share2, 
  Bot, 
  Flame, 
  Shield, 
  Activity, 
  Sparkles,
  TrendingUp
} from 'lucide-react';

export interface SquadEvaluation {
  overallRating: number;
  titleBadge: string;
  projectedFinish: string;
  departmentGrades: {
    P: { grade: number; review: string };
    D: { grade: number; review: string };
    C: { grade: number; review: string };
    A: { grade: number; review: string };
  };
  strengths: string[];
  weaknesses: string[];
  auctionTip: string;
}

interface SquadJudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: SquadEvaluation | null;
  isLoading: boolean;
  squadName: string;
  totalPlayersCount: number;
  modelUsed?: string;
}

export const SquadJudgeModal: React.FC<SquadJudgeModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  isLoading,
  squadName,
  totalPlayersCount,
  modelUsed
}) => {
  if (!isOpen) return null;

  const handleShare = () => {
    if (!evaluation) return;
    const text = `🏆 *PAGELLE FANTA-ROSA - ${squadName.toUpperCase()}* 🏆\n\n` +
      `🎖️ *Voto Globale: ${evaluation.overallRating}/10* - ${evaluation.titleBadge}\n` +
      `🎯 *Piazzamento Previsto:* ${evaluation.projectedFinish}\n\n` +
      `🧤 *Porta:* ${evaluation.departmentGrades.P.grade}/10 - ${evaluation.departmentGrades.P.review}\n` +
      `🛡️ *Difesa:* ${evaluation.departmentGrades.D.grade}/10 - ${evaluation.departmentGrades.D.review}\n` +
      `⚙️ *Centrocampo:* ${evaluation.departmentGrades.C.grade}/10 - ${evaluation.departmentGrades.C.review}\n` +
      `⚽ *Attacco:* ${evaluation.departmentGrades.A.grade}/10 - ${evaluation.departmentGrades.A.review}\n\n` +
      `💪 *Punti di Forza:*\n${evaluation.strengths.map(s => `• ${s}`).join('\n')}\n\n` +
      `⚠️ *Punti Deboli:*\n${evaluation.weaknesses.map(w => `• ${w}`).join('\n')}\n\n` +
      `💡 *Consiglio:* ${evaluation.auctionTip}\n\n` +
      `_Valutato da FantaOptimizer Pro (Google Gemini AI)_`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('Pagella copiata negli appunti, pronta per WhatsApp.');
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 8.5) return 'var(--accent-emerald-light)';
    if (grade >= 7.5) return 'var(--info)';
    if (grade >= 6.5) return 'var(--accent-gold)';
    return 'var(--danger)';
  };

  const roleLabels: Record<Role, { name: string; role: Role }> = {
    P: { name: 'Porta', role: 'P' },
    D: { name: 'Difesa', role: 'D' },
    C: { name: 'Centrocampo', role: 'C' },
    A: { name: 'Attacco', role: 'A' }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Trophy size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Fanta-Pagelle & Giudizio Rosa</span>
                <span style={{ fontSize: '0.72rem', background: 'var(--accent-emerald-soft)', color: 'var(--accent-emerald-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                  {modelUsed || 'Gemini 3.5 AI'}
                </span>
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {squadName} ({totalPlayersCount}/25 giocatori)
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-emerald)', animation: 'spin 0.8s linear infinite' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>
                Analisi tattica in corso...
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Stiamo esaminando bonus attesi, solidità difensiva, rigoristi e gerarchie d'asta
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && evaluation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Big Rating Banner */}
            <div style={{ 
              background: 'var(--bg-card-subtle)', 
              border: '1px solid var(--accent-gold-border)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-gold)', fontWeight: 800, marginBottom: '4px' }}>
                  VALUTAZIONE GLOBALE ROSA
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: getGradeColor(evaluation.overallRating), lineHeight: 1 }}>
                    {evaluation.overallRating.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    / 10
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginLeft: '6px' }}>
                    {evaluation.titleBadge}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Obiettivo di Stagione Stimato:
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald-light)' }}>
                  {evaluation.projectedFinish}
                </div>
              </div>
            </div>

            {/* Department Grades Grid */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-secondary)' }}>
                📊 PAGELLE PER REPARTO:
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '10px' }}>
                {(['P', 'D', 'C', 'A'] as Role[]).map(role => {
                  const dept = evaluation.departmentGrades[role];
                  if (!dept) return null;
                  const label = roleLabels[role];
                  const gradeColor = getGradeColor(dept.grade);

                  return (
                    <div 
                      key={role}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`role-badge ${label.role}`}>{label.role}</span>
                          <strong style={{ fontSize: '0.95rem' }}>{label.name}</strong>
                        </div>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: gradeColor }}>
                          {dept.grade.toFixed(1)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 10</span>
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-card)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ width: `${(dept.grade / 10) * 100}%`, height: '100%', background: gradeColor }} />
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                        {dept.review}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths & Weaknesses 2-Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {/* Strengths */}
              <div style={{ background: 'var(--accent-emerald-soft)', border: '1px solid var(--accent-emerald-border)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-emerald-light)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <CheckCircle2 size={16} />
                  <span>Punti di Forza</span>
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {evaluation.strengths.map((s, idx) => (
                    <li key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <AlertTriangle size={16} />
                  <span>Aree di Attenzione / Rischi</span>
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {evaluation.weaknesses.map((w, idx) => (
                    <li key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Auction Tip Box */}
            <div style={{ background: 'var(--accent-gold-soft)', border: '1px solid var(--accent-gold-border)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Lightbulb size={20} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--accent-gold)', display: 'block', marginBottom: '2px' }}>
                  Consiglio Tattico dell'Esperto:
                </strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4, margin: 0 }}>
                  {evaluation.auctionTip}
                </p>
              </div>
            </div>

            {/* Actions Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '10px' }}>
              <button
                onClick={handleShare}
                className="btn-secondary"
                style={{ padding: '9px 16px', fontSize: '0.85rem', gap: '6px' }}
              >
                <Share2 size={15} />
                <span>Copia pagella per WhatsApp</span>
              </button>

              <button
                onClick={onClose}
                className="btn-primary"
                style={{ padding: '9px 24px', fontSize: '0.85rem' }}
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
