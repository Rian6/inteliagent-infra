export const emptyClassification = () => ({ idCidade: null, idCategoria: null, atividade: null, tipo: null });
const collections = { idCidade: 'municipios', idCategoria: 'categorias', atividade: 'atividades', tipo: 'tipos' };
export function selectedClassification(plan, catalog) {
  return plan.catalogoVersao === catalog.version
    ? Object.fromEntries(Object.keys(collections).map(key => [key, plan[key] ?? null]))
    : emptyClassification();
}
export function mergeClassification(previous, selected, catalog) {
  const keys = Object.keys(collections);
  const hasSelection = keys.some(key => selected[key] !== null && selected[key] !== undefined && selected[key] !== '');
  if (!hasSelection) return {
    ...Object.fromEntries(keys.map(key => [key, previous[key] ?? null])),
    catalogoVersao: previous.catalogoVersao ?? null,
  };
  for (const key of keys) {
    if (!catalog[collections[key]].some(option => option.value === Number(selected[key])))
      throw new Error('Selecione município, categoria, atividade e tipo para registrar a classificação.');
  }
  return { ...Object.fromEntries(keys.map(key => [key, Number(selected[key])])), catalogoVersao: catalog.version };
}
export function planningCycle(value) {
  if (value === '' || value === null || value === undefined) return null;
  const cycle = Number(value);
  if (!Number.isInteger(cycle) || cycle < 0 || cycle > 99) throw new Error('Informe um ciclo inteiro de 0 a 99.');
  return cycle;
}
export function validatePlanningClassification(plan, catalog) {
  planningCycle(plan.ciclo);
  if (plan.catalogoVersao == null) return;
  if (plan.catalogoVersao !== catalog.version) throw new Error('Versão de classificação não suportada.');
  const selected = mergeClassification({}, plan, catalog);
  if (!selected.catalogoVersao) throw new Error('Preencha a classificação do planejamento.');
}
