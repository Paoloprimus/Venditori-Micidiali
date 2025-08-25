export function makeSessionTitle(d = new Date()) {
  const weekday = d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '').toLowerCase();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${weekday} ${dd}/${mm}/${yy}`;
}
