# Handoff Summary

## Visione
Un **assistente AI conversazionale per venditori**, accessibile via chat (testo e voce) con TTS avanzato e interfaccia Tailwind.  
L’obiettivo è **ridurre al minimo il carico operativo** del venditore: niente form complessi, solo interazioni naturali.

## Obiettivo prodotto
- **Sales Co-Pilot**: memoria personalizzata, generatore automatico di proposte, aggiunta rapida di dati via voce.  
- **Gestione integrata**: clienti, contatti, prodotti, proposte commerciali.  
- **Ergonomia**: input naturale → tradotto in dati strutturati → aggiornamento automatico del DB.  
- **Analisi proattiva**: l’assistente individua criticità nella routine e produce report personalizzati per migliorare l’efficacia del venditore.

## Stack tecnico (alto livello)
- **Frontend**: Next.js (React + TailwindCSS)  
- **Backend**: API Routes (Next.js) + OpenAI endpoints  
- **Database**: Supabase (Postgres + RLS)  
- **Deploy**: Vercel (app) + Supabase (DB)  
