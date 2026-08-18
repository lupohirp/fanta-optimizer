# ⚽ FantaOptimizer Pro

Applicazione web professionale in **Next.js & TypeScript** per l'ottimizzazione e la generazione delle rose del Fantacalcio, con calibrazione dinamica del budget in crediti, analisi statistiche avanzate (FantaMedia, rigoristi, piazzati, titolarità), assistente per asta live in tempo reale e confronto strategie.

---

## 🌟 Funzionalità Principali

1. **⚡ Generatore Intelligente di Rose**:
   - **Calcolo Dinamico dei Prezzi**: I prezzi si adattano al budget totale (es. 500, 1000 crediti) e al numero di partecipanti alla lega (6, 8, 10, 12 squadre).
   - **5 Archetipi di Strategia**:
     - 🎯 *Bilanciata (Moneyball)*: Massimo rendimento per credito.
     - ⚔️ *Attacco Pesante*: 50-55% del budget concentrato sui bomber principali.
     - 🛡️ *Modificatore Difesa*: Portiere di primissima fascia + 3-4 difensori da bonus/6.5.
     - ⚡ *Centrocampo da Bonus*: Incursori e rigoristi in mediana + attacco corale.
     - 🎲 *Scommesse & Talenti*: Giovani promesse ed exploit a basso costo.
   - **Player Pinning (Blocco Giocatori)**: Fissa i tuoi calciatori preferiti e l'ottimizzatore calcolerà la rosa ideale con i crediti rimanenti.
   - **Visuale a Campo (Pitch View)**: Visualizzazione 3D dell'11 titolare secondo il miglior modulo tattico (3-4-3, 4-3-3, 3-5-2, ecc.) + panchina.
   - **Esportazione & Condivisione**: Copia la rosa formattata con emoji per WhatsApp o scarica il file CSV.

2. **🎯 Assistente Asta Live (Live Auction Room)**:
   - Tracciamento in tempo reale di ogni singolo acquisto durante l'asta con gli amici.
   - **Ricalcolo istantaneo del budget**: Se paghi un giocatore più o meno del previsto, i crediti residui e gli slot successivi si ricalibrano automaticamente.
   - **Pulsante "Piano B"**: Se perdi un'asta, visualizza immediatamente le migliori alternative per prezzo e rendimento atteso.

3. **📊 Listino & Database Calciatori**:
   - Ricerca rapida per nome o squadra.
   - Filtri per ruolo, rigoristi, titolari fissi (≥80%) e tier.
   - Ordinamento per prezzo d'asta, FantaMedia attesa, quotazione e gol stimati.

4. **⚔️ Confronto Strategie**:
   - Benchmark comparativo affiancato per verificare quale strategia massimizza i punti attesi e i gol per la tua lega.

5. **📖 Guida & Consigli Tattici**:
   - Metodologia matematica di ripartizione budget, regole del modificatore difesa, valore dei rigoristi e gestione dell'asta.

---

## 🚀 Avvio Locale

```bash
# Entra nella cartella del progetto
cd /home/pakilodi/Github/fanta-optimizer

# Installa le dipendenze (se non già fatto)
npm install

# Avvia il server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser per visualizzare l'app.

---

## 🌐 Distribuzione su Vercel (1-Click Deploy)

L'app è già configurata al 100% per **Vercel**:

### Opzione 1: Tramite GitHub (Consigliata)
1. Crea un repository su [GitHub](https://github.com/new) (es. `fanta-optimizer`).
2. Collega ed esegui il push:
   ```bash
   git remote add origin https://github.com/TUO_USERNAME/fanta-optimizer.git
   git push -u origin main
   ```
3. Vai su [Vercel](https://vercel.com/new), importa il repository e clicca su **Deploy** (zero configurazioni richieste).

### Opzione 2: Tramite Vercel CLI
```bash
npx vercel
```
