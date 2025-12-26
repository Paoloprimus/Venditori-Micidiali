/**
 * REPING COPILOT - Tier Configuration
 * 
 * Struttura tier per REPING COPILOT (versione light):
 * 
 * | Tier     | Ruolo DB             | €/mese | AI msg/g | Province | POI ATTIVI* | Itinerari | Napoleon |
 * |----------|----------------------|--------|----------|----------|-------------|-----------|----------|
 * | FREE     | agente               | 0      | 5        | 1        | 100         | ∞         | ✅       |
 * | PREMIUM  | agente_premium       | 9      | 20       | 1        | 200         | ∞         | ✅       |
 * | PREMIUM+ | agente_premium_plus  | 29     | TBD      | ∞        | 2000        | ∞         | ✅       |
 * 
 * * POI ATTIVI = luoghi visitati, con note, o inseriti in itinerari
 *   (NON è il limite di visualizzazione/download dalla lista pubblica - quello è separato)
 * 
 * NOTA: REPING COPILOT PRO è un prodotto separato (CRM completo) - non gestito qui
 */

// Ruoli del database (come definiti in profiles.role)
export type UserRole = 
  | 'agente'               // FREE
  | 'agente_premium'       // PREMIUM €9
  | 'agente_premium_plus'  // PREMIUM+ €29
  | 'admin' 
  | 'tester';

// Tier commerciali COPILOT
export type CopilotTier = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';

// Mapping ruolo DB → tier commerciale
export const ROLE_TO_TIER: Record<UserRole, CopilotTier | 'ADMIN'> = {
  agente: 'FREE',
  agente_premium: 'PREMIUM',
  agente_premium_plus: 'PREMIUM_PLUS',
  admin: 'ADMIN',
  tester: 'FREE',
};

export interface TierInfo {
  // DB role
  role: UserRole;
  
  // Tier commerciale
  tier: CopilotTier;
  
  // Nome commerciale
  name: string;
  
  // Prezzo mensile (€)
  price: number;
  
  // Limiti
  limits: {
    maxAIMessagesPerDay: number;
    provincesLimit: number | null; // null = illimitato
    maxActivePlaces: number;       // POI ATTIVI (visitati, con note, in itinerari)
    // maxRoutes: NON SERVE, itinerari sono liberi
    // download POI pubblici: limite separato, da definire
  };
  
  // Feature flags
  features: {
    napoleon: boolean;          // Suggerimenti AI proattivi
    aiOnNotes: boolean;         // AI può leggere note locali
    analyticsAdvanced: boolean;
    drivingModeAdvanced: boolean;
    detailedReports: boolean;
    exportCSV: boolean;
    exportExcel: boolean;
    calendar: boolean;
    notifications: boolean;
  };
}

/**
 * Configurazione tier REPING COPILOT
 */
export const TIERS: Record<CopilotTier, TierInfo> = {
  FREE: {
    role: 'agente',
    tier: 'FREE',
    name: 'COPILOT Free',
    price: 0,
    limits: {
      maxAIMessagesPerDay: 5,
      provincesLimit: 1,
      maxActivePlaces: 100,  // POI attivi (visitati/note/itinerari)
    },
    features: {
      napoleon: true,           // ✅ Napoleon per tutti
      aiOnNotes: true,          // ✅ AI può leggere note
      analyticsAdvanced: false,
      drivingModeAdvanced: false,
      detailedReports: false,
      exportCSV: false,
      exportExcel: false,
      calendar: false,
      notifications: false,
    },
  },

  PREMIUM: {
    role: 'agente_premium',
    tier: 'PREMIUM',
    name: 'COPILOT Premium',
    price: 9,
    limits: {
      maxAIMessagesPerDay: 20,
      provincesLimit: 1,
      maxActivePlaces: 200,  // POI attivi (visitati/note/itinerari)
    },
    features: {
      napoleon: true,           // ✅ Napoleon per tutti
      aiOnNotes: true,          // ✅ AI può leggere note
      analyticsAdvanced: true,
      drivingModeAdvanced: true,
      detailedReports: true,
      exportCSV: true,
      exportExcel: false,
      calendar: true,
      notifications: true,
    },
  },

  PREMIUM_PLUS: {
    role: 'agente_premium_plus',
    tier: 'PREMIUM_PLUS',
    name: 'COPILOT Premium+',
    price: 29,
    limits: {
      maxAIMessagesPerDay: 100, // TBD - per ora 100
      provincesLimit: null,     // Illimitato
      maxActivePlaces: 2000,    // POI attivi (visitati/note/itinerari)
    },
    features: {
      napoleon: true,           // ✅ Napoleon per tutti
      aiOnNotes: true,          // ✅ AI può leggere note
      analyticsAdvanced: true,
      drivingModeAdvanced: true,
      detailedReports: true,
      exportCSV: true,
      exportExcel: true,
      calendar: true,
      notifications: true,
    },
  },
};

/**
 * Ottieni tier info dal ruolo DB
 */
export function getTierFromRole(role: UserRole): TierInfo {
  const tierKey = ROLE_TO_TIER[role];
  
  // Admin usa PREMIUM_PLUS limits
  if (tierKey === 'ADMIN') {
    return {
      ...TIERS.PREMIUM_PLUS,
      role: 'admin',
      name: 'Amministratore',
      price: 0,
      limits: {
        maxAIMessagesPerDay: 999999,
        provincesLimit: null,
        maxActivePlaces: 999999,
      },
    };
  }
  
  return TIERS[tierKey as CopilotTier] || TIERS.FREE;
}

/**
 * Ottieni tier commerciale dal ruolo DB
 */
export function getTierKey(role: UserRole): CopilotTier | 'ADMIN' {
  return ROLE_TO_TIER[role] || 'FREE';
}

/**
 * Verifica se utente ha una feature
 */
export function hasFeature(
  role: UserRole,
  feature: keyof TierInfo['features']
): boolean {
  const tier = getTierFromRole(role);
  return tier.features[feature];
}

/**
 * Verifica se utente ha raggiunto limite POI ATTIVI
 * (visitati, con note, in itinerari)
 */
export function hasReachedActivePlacesLimit(
  role: UserRole,
  currentCount: number
): boolean {
  const tier = getTierFromRole(role);
  return currentCount >= tier.limits.maxActivePlaces;
}

/**
 * Verifica se utente ha raggiunto limite AI messages
 */
export function hasReachedAILimit(
  role: UserRole,
  currentCount: number
): boolean {
  const tier = getTierFromRole(role);
  return currentCount >= tier.limits.maxAIMessagesPerDay;
}

/**
 * Verifica se provincia è disponibile per l'utente
 * Per FREE/PREMIUM: solo la provincia selezionata in onboarding
 * Per PREMIUM+: tutte
 */
export function canAccessProvince(
  role: UserRole,
  userSelectedProvince: string,
  targetProvince: string
): boolean {
  const tier = getTierFromRole(role);
  
  // Illimitato
  if (tier.limits.provincesLimit === null) return true;
  
  // Solo la provincia selezionata
  return userSelectedProvince.toUpperCase() === targetProvince.toUpperCase();
}

/**
 * Ottieni messaggio per upgrade
 */
export function getUpgradeMessage(
  currentRole: UserRole,
  limitType: 'places' | 'ai' | 'provinces'
): string {
  const currentTier = getTierFromRole(currentRole);
  
  // Determina next tier
  let nextTier: TierInfo;
  if (currentTier.tier === 'FREE') {
    nextTier = TIERS.PREMIUM;
  } else if (currentTier.tier === 'PREMIUM') {
    nextTier = TIERS.PREMIUM_PLUS;
  } else {
    return ''; // Già al massimo
  }
  
  switch (limitType) {
    case 'places':
      return `Hai raggiunto il limite di ${currentTier.limits.maxActivePlaces} luoghi attivi. Passa a ${nextTier.name} (€${nextTier.price}/mese) per gestirne fino a ${nextTier.limits.maxActivePlaces}!`;
    case 'ai':
      return `Hai esaurito i tuoi ${currentTier.limits.maxAIMessagesPerDay} messaggi AI di oggi. Passa a ${nextTier.name} (€${nextTier.price}/mese) per più messaggi!`;
    case 'provinces':
      return `Con ${currentTier.name} puoi accedere solo a 1 provincia. Passa a ${nextTier.name} (€${nextTier.price}/mese) per province illimitate!`;
    default:
      return `Passa a ${nextTier.name} per sbloccare più funzionalità!`;
  }
}

/**
 * Ottieni colore badge per tier
 */
export function getTierBadgeColor(tier: CopilotTier | 'ADMIN'): string {
  switch (tier) {
    case 'FREE':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'PREMIUM':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PREMIUM_PLUS':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'ADMIN':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Lista province italiane
 */
export const ITALIAN_PROVINCES = [
  { code: 'VR', name: 'Verona', region: 'Veneto' },
  { code: 'VI', name: 'Vicenza', region: 'Veneto' },
  { code: 'TV', name: 'Treviso', region: 'Veneto' },
  { code: 'PD', name: 'Padova', region: 'Veneto' },
  { code: 'VE', name: 'Venezia', region: 'Veneto' },
  { code: 'RO', name: 'Rovigo', region: 'Veneto' },
  { code: 'BL', name: 'Belluno', region: 'Veneto' },
  // ... altre province da aggiungere
] as const;

/**
 * Statistiche tier per dashboard
 */
export function getTierComparisonTable() {
  return Object.values(TIERS).map(tier => ({
    tier: tier.tier,
    name: tier.name,
    price: tier.price,
    aiMessages: tier.limits.maxAIMessagesPerDay,
    provinces: tier.limits.provincesLimit === null ? '∞' : tier.limits.provincesLimit,
    activePlaces: tier.limits.maxActivePlaces, // POI attivi (visitati/note/itinerari)
    routes: '∞',
    napoleon: tier.features.napoleon ? '✅' : '❌',
  }));
}
