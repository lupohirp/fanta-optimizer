import { Player, Role } from '../types';
import { normalizeName } from './text';

/**
 * Riaggancia un giocatore salvato in locale al listone aggiornato.
 *
 * Il listone cambia durante il mercato: giocatori entrano, escono, cambiano
 * squadra. Fidarsi ciecamente dell'id salvato significa rischiare di mostrare
 * un giocatore al posto di un altro, e in passato è successo davvero. Qui l'id
 * è solo il primo tentativo: viene accettato solo se anche nome e ruolo
 * corrispondono, altrimenti si riaggancia per identità.
 *
 * `expectedRole` è il ruolo dello slot che ospita il giocatore: se non
 * corrisponde, lo slot era corrotto e va svuotato invece che mostrato sbagliato.
 */
export function resolveStoredPlayer(
  stored: Player | null | undefined,
  allPlayers: Player[],
  expectedRole?: Role
): Player | null {
  if (!stored || !stored.name) return null;

  // Un difensore finito in uno slot da portiere non va "corretto": va tolto
  if (expectedRole && stored.role !== expectedRole) return null;

  const storedName = normalizeName(stored.name);
  const storedTeam = normalizeName(stored.team || '');

  const byId = allPlayers.find(p => p.id === stored.id);
  if (byId && byId.role === stored.role && normalizeName(byId.name) === storedName) {
    return byId;
  }

  // L'id non è affidabile: si cerca la persona, prima nella stessa squadra
  const sameTeam = allPlayers.find(
    p => p.role === stored.role && normalizeName(p.name) === storedName && normalizeName(p.team) === storedTeam
  );
  if (sameTeam) return sameTeam;

  // Poi ovunque, per coprire i trasferimenti
  const anyTeam = allPlayers.find(p => p.role === stored.role && normalizeName(p.name) === storedName);
  if (anyTeam) return anyTeam;

  // Non è più nel listone: si tiene quello salvato, con i suoi dati d'allora
  return stored;
}

/** Versione per una lista di slot di un reparto, con il ruolo atteso applicato a tutti */
export function resolveStoredSlots(
  stored: Array<Player | null> | undefined,
  allPlayers: Player[],
  expectedRole: Role,
  size: number
): Array<Player | null> {
  const source = Array.isArray(stored) ? stored : [];
  const out: Array<Player | null> = [];
  for (let i = 0; i < size; i++) {
    out.push(resolveStoredPlayer(source[i], allPlayers, expectedRole));
  }
  return out;
}
