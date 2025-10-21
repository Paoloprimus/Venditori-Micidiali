// lib/nlu/scope.ts
export type LocalScope = "clients" | "prodotti" | "ordini" | "vendite";
export type PlannerScope = "clients" | "products" | "orders" | "sales";

export function toPlannerScope(s: LocalScope): PlannerScope {
  switch (s) {
    case "clients": return "clients";
    case "prodotti": return "products";
    case "ordini": return "orders";
    case "vendite": return "sales";
    default: return "clients";
  }
}
