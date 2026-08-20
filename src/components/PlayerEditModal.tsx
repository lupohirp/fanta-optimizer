'use client';

import React, { useState, useEffect } from 'react';
import { Player, Role } from '../types';
import { SERIE_A_TEAMS } from '../data/players';
import { 
  UserPlus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Coins, 
  Target,
  Sparkles
} from 'lucide-react';

interface PlayerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerToEdit: Player | null; // null means adding a new player
  onSavePlayer: (player: Player) => void;
  onDeletePlayer?: (playerId: string) => void;
}

export const PlayerEditModal: React.FC<PlayerEditModalProps> = ({
  isOpen,
  onClose,
  playerToEdit,
  onSavePlayer,
  onDeletePlayer
}) => {
  const isEditing = Boolean(playerToEdit);

  const [name, setName] = useState('');
  const [team, setTeam] = useState('Inter');
  const [role, setRole] = useState<Role>('A');
  const [quotation, setQuotazione] = useState(15);
  const [estimatedPrice500, setEstimatedPrice500] = useState(20);
  const [expectedPoints, setExpectedPoints] = useState(6.5);
  const [tier, setTier] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [isPenaltyTaker, setIsPenaltyTaker] = useState(false);
  const [isFreeKickTaker, setIsFreeKickTaker] = useState(false);
  const [starterProbability, setStarterProbability] = useState(85);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (playerToEdit) {
      setName(playerToEdit.name);
      setTeam(playerToEdit.team);
      setRole(playerToEdit.role);
      setQuotazione(playerToEdit.quotation);
      setEstimatedPrice500(playerToEdit.estimatedPrice500);
      setExpectedPoints(playerToEdit.expectedPoints);
      setTier(playerToEdit.tier);
      setIsPenaltyTaker(playerToEdit.isPenaltyTaker);
      setIsFreeKickTaker(playerToEdit.isFreeKickTaker);
      setStarterProbability(playerToEdit.starterProbability);
      setNotes(playerToEdit.notes || '');
    } else {
      setName('');
      setTeam('Lazio');
      setRole('A');
      setQuotazione(15);
      setEstimatedPrice500(25);
      setExpectedPoints(6.8);
      setTier(2);
      setIsPenaltyTaker(false);
      setIsFreeKickTaker(false);
      setStarterProbability(85);
      setNotes('');
    }
  }, [playerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedPlayer: Player = {
      id: playerToEdit ? playerToEdit.id : `custom-${role}-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: name.trim(),
      team,
      role,
      quotation: Number(quotation),
      estimatedPrice500: Number(estimatedPrice500),
      expectedPoints: Number(expectedPoints),
      tier: Number(tier) as 1 | 2 | 3 | 4 | 5,
      isPenaltyTaker,
      isFreeKickTaker,
      starterProbability: Number(starterProbability),
      expectedGoals: role === 'A' ? (tier === 1 ? 16 : 8) : (role === 'C' ? 5 : 1),
      expectedAssists: role === 'A' || role === 'C' ? 4 : 2,
      trend: 'stable',
      notes: notes.trim() || 'Modificato manualmente dall\'utente'
    };

    onSavePlayer(savedPlayer);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              {isEditing ? <Edit3 size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {isEditing ? `Modifica ${playerToEdit?.name}` : 'Aggiungi Nuovo Calciatore'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {isEditing ? 'Aggiorna squadra, prezzo o statistiche del giocatore' : 'Inserisci un nuovo acquisto di calciomercato'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Name & Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Nome e Cognome *
              </label>
              <input
                type="text"
                required
                placeholder="Es. Castellanos, Dia, Lookman..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Ruolo
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="P">P (Portiere)</option>
                <option value="D">D (Difensore)</option>
                <option value="C">C (Centrocampista)</option>
                <option value="A">A (Attaccante)</option>
              </select>
            </div>
          </div>

          {/* Team & Tier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Squadra di Serie A
              </label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem'
                }}
              >
                {SERIE_A_TEAMS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Fascia / Tier
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem'
                }}
              >
                <option value={1}>Tier 1 (Top Assoluto)</option>
                <option value={2}>Tier 2 (Semitop / 2° Slot)</option>
                <option value={3}>Tier 3 (Titolare Medio)</option>
                <option value={4}>Tier 4 (Rotazione)</option>
                <option value={5}>Tier 5 (Scommessa / Low Cost)</option>
              </select>
            </div>
          </div>

          {/* Quotazione, Prezzo Asta 500, FantaMedia */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Quotazione Listino
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={quotation}
                onChange={(e) => setQuotazione(parseInt(e.target.value) || 1)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Prezzo Asta (500cr)
              </label>
              <input
                type="number"
                min={1}
                max={400}
                value={estimatedPrice500}
                onChange={(e) => setEstimatedPrice500(parseInt(e.target.value) || 1)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 10px',
                  color: 'var(--accent-gold)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                FantaMedia Attesa
              </label>
              <input
                type="number"
                step="0.1"
                min={4.0}
                max={10.0}
                value={expectedPoints}
                onChange={(e) => setExpectedPoints(parseFloat(e.target.value) || 6.0)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 10px',
                  color: 'var(--accent-emerald-light)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          </div>

          {/* Toggles: Rigorista, Piazzati, Titolarità */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
              <input
                type="checkbox"
                checked={isPenaltyTaker}
                onChange={(e) => setIsPenaltyTaker(e.target.checked)}
                style={{ accentColor: 'var(--accent-emerald)' }}
              />
              <span>Rigorista</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
              <input
                type="checkbox"
                checked={isFreeKickTaker}
                onChange={(e) => setIsFreeKickTaker(e.target.checked)}
                style={{ accentColor: 'var(--accent-emerald)' }}
              />
              <span>Calci piazzati</span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', fontSize: '0.82rem' }}>
              <span>Titolarità:</span>
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={starterProbability}
                onChange={(e) => setStarterProbability(parseInt(e.target.value) || 80)}
                style={{
                  width: '55px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 6px',
                  color: 'var(--text-primary)',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <span>%</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Note Scout / Consigli
            </label>
            <input
              type="text"
              placeholder="Es. Nuovo titolare in attacco, ottima fanta-media..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', gap: '10px' }}>
            {isEditing && onDeletePlayer && (
              <button
                type="button"
                onClick={() => {
                  if (playerToEdit) onDeletePlayer(playerToEdit.id);
                  onClose();
                }}
                className="btn-secondary"
                style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', gap: '6px' }}
              >
                <Trash2 size={15} />
                <span>Elimina Giocatore</span>
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button type="button" onClick={onClose} className="btn-secondary">
                Annulla
              </button>

              <button type="submit" className="btn-primary" style={{ gap: '6px' }}>
                <Check size={16} />
                <span>{isEditing ? 'Salva Modifiche' : 'Aggiungi Giocatore'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
