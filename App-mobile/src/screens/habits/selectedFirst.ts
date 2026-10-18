/** Porta in cima l'abitudine aperta da un'altra schermata, senza modificare l'archivio. */
export function selectedFirst<T extends { id: string }>(items: T[], selectedId?: string): T[] {
  if (!selectedId) return items;
  const selected = items.find(item => item.id === selectedId);
  return selected ? [selected, ...items.filter(item => item.id !== selectedId)] : items;
}
