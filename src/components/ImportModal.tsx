'use client';

import React, { useState, useRef } from 'react';
import { Player, Role } from '../types';
import { parsePlayerFile } from '../lib/importer';
import { syncLivePlayers } from '../lib/sync';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Link2,
  X,
  Radio
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newPlayers: Player[]) => void;
  onResetDefault: () => void;
  currentPlayersCount: number;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onResetDefault,
  currentPlayersCount
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewPlayers, setPreviewPlayers] = useState<Player[] | null>(null);
  const [remoteFeedUrl, setRemoteFeedUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { players } = await parsePlayerFile(file);
      if (players.length === 0) {
        setErrorMsg('Nessun giocatore valido trovato. Assicurati che contenga le colonne Ruolo, Nome, Squadra, Quotazione/FVM.');
      } else {
        setPreviewPlayers(players);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante la lettura del file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchRemoteUrl = async () => {
    if (!remoteFeedUrl.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await syncLivePlayers(remoteFeedUrl.trim());
      if (res.success && res.players.length > 0) {
        setPreviewPlayers(res.players);
      } else {
        setErrorMsg(res.message || 'Impossibile estrarre i calciatori da questo URL.');
      }
    } catch (err: any) {
      setErrorMsg(`Errore: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (previewPlayers && previewPlayers.length > 0) {
      onImportSuccess(previewPlayers);
      onClose();
    }
  };

  const getRoleCount = (role: Role) => {
    if (!previewPlayers) return 0;
    return previewPlayers.filter(p => p.role === role).length;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(16, 185, 129, 0.2)', 
              color: 'var(--accent-emerald-light)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Listino & Auto-Aggiornamento</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Carica un file Excel oppure collega un feed online in tempo reale
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Tab switch File vs Live URL */}
        {!previewPlayers && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setActiveTab('file')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 700,
                background: activeTab === 'file' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'file' ? '#fff' : 'var(--text-secondary)',
                border: activeTab === 'file' ? '1px solid var(--border-subtle)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FileSpreadsheet size={15} />
              <span>Carica File (.xlsx / .csv)</span>
            </button>

            <button
              onClick={() => setActiveTab('link')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 700,
                background: activeTab === 'link' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'link' ? '#fff' : 'var(--text-secondary)',
                border: activeTab === 'link' ? '1px solid var(--border-subtle)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Link2 size={15} />
              <span>Feed Live URL (Google Sheet)</span>
            </button>
          </div>
        )}

        {/* Content based on Tab */}
        {!previewPlayers ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeTab === 'file' ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                  background: isDragging ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-input)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <UploadCloud size={40} style={{ color: isDragging ? 'var(--accent-emerald-light)' : 'var(--text-secondary)' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      Trascina qui il file Excel/CSV o clicca per sfogliare
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Supporta i file ufficiali di <strong>Fantacalcio.it</strong> (Quotazioni_Fantacalcio_*.xlsx)
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Collega un <strong>Google Sheet pubblicato come CSV</strong> o un endpoint web per sincronizzare automaticamente le modifiche della tua lega o del listone:
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                    value={remoteFeedUrl}
                    onChange={(e) => setRemoteFeedUrl(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem'
                    }}
                  />
                  <button
                    onClick={handleFetchRemoteUrl}
                    disabled={isLoading || !remoteFeedUrl.trim()}
                    className="btn-primary"
                    style={{ padding: '10px 16px', fontSize: '0.88rem' }}
                  >
                    {isLoading ? <RefreshCw size={16} className="spin" /> : 'Sincronizza'}
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Database attivo: <strong>{currentPlayersCount}</strong> calciatori
              </div>

              <button
                type="button"
                onClick={() => {
                  onResetDefault();
                  onClose();
                }}
                className="btn-secondary"
                style={{ padding: '7px 12px', fontSize: '0.78rem', gap: '6px' }}
              >
                <RefreshCw size={13} />
                <span>Ripristina Default</span>
              </button>
            </div>
          </div>
        ) : (
          /* Preview screen */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--accent-emerald-light)' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-emerald-light)' }}>
                  Dati pronti per l'applicazione!
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Riconosciuti <strong>{previewPlayers.length} calciatori</strong>.
                </div>
              </div>
            </div>

            {/* Role Breakdown summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <span className="role-badge P">P</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{getRoleCount('P')}</div>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <span className="role-badge D">D</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{getRoleCount('D')}</div>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <span className="role-badge C">C</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{getRoleCount('C')}</div>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <span className="role-badge A">A</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{getRoleCount('A')}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setPreviewPlayers(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="btn-primary"
                style={{ flex: 1.5 }}
              >
                <CheckCircle2 size={16} />
                <span>Applica ({previewPlayers.length} Giocatori)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
