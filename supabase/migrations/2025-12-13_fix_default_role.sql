-- ============================================================================
-- MIGRAZIONE: Fix Default Role per nuovi utenti
-- Data: 13 Dicembre 2025
-- ============================================================================
-- PROBLEMA: Il default era 'agente' ma quel ruolo non esiste più nel constraint.
-- Nuovi utenti fallivano con "Database error saving new user"
-- ============================================================================

-- Cambia il default del ruolo da 'agente' a 'tester' (per utenti Beta)
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'tester';

-- ============================================================================
-- NOTA: Esegui questa query SUBITO su Supabase Dashboard → SQL Editor
-- per sbloccare le registrazioni!
-- ============================================================================
