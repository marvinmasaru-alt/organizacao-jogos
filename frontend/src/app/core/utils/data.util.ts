/**
 * Formata em YYYY-MM-DD usando os componentes LOCAIS da data — nunca usar
 * toISOString() aqui, porque ele converte pra UTC e desalinha o dia em
 * qualquer fuso diferente de UTC+0 (ex.: JST é UTC+9).
 */
export function paraDataIso(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
