// app/data/adapters.local.ts

/**
 * Interfaccia dati fittizia (mock locale)
 * Simula risposte di Repping senza toccare il database.
 */

export type Client = {
  id: string;
  name: string;
  email: string;
};

export type Product = {
  id: string;
  name: string;
  available: boolean;
};

// --- MOCK DATA -------------------------------------------------

const mockClients: Client[] = [
  { id: "c1", name: "Bar Centrale", email: "barcentrale@example.com" },
  { id: "c2", name: "Pasticceria Blu", email: "pasticceriablu@example.com" },
  { id: "c3", name: "Market Verdi", email: "marketverdi@example.com" },
];

const mockProducts: Product[] = [
  { id: "p1", name: "Cornetti", available: true },
  { id: "p2", name: "Caffè Arabica", available: false },
  { id: "p3", name: "Latte Bio", available: true },
  { id: "p4", name: "Zucchero", available: false },
];

// --- INTERFACCIA PUBBLICA -------------------------------------

export const dataAdapter = {
  // CLIENTI
  async countClients() {
    return mockClients.length;
  },

  async listClientNames() {
    return mockClients.map((c) => c.name);
  },

  async listClientEmails() {
    return mockClients.map((c) => c.email);
  },

  // PRODOTTI
  async countProducts() {
    return mockProducts.length;
  },

  async listMissingProducts() {
    return mockProducts.filter((p) => !p.available).map((p) => p.name);
  },
};
