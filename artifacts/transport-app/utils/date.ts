export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(value: string | Date): string {
  const elapsedSeconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);

  if (elapsedSeconds < 60) return 'Hace unos segundos';
  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `Hace ${elapsedMinutes} min`;
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Hace ${elapsedHours} h`;
  const elapsedDays = Math.round(elapsedHours / 24);
  return `Hace ${elapsedDays} ${elapsedDays === 1 ? 'día' : 'días'}`;
}