export function redactPII(input: string): string {
  if (!input) return "";
  return input
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "<NOME>")
    .replace(/\S+@\S+\.\S+/g, "<EMAIL>")
    .replace(/\b\d{2,}\b/g, "<NUM>");
}
