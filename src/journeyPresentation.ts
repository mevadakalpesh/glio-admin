export function formatJourneyDuration(value: unknown, hours = false): string {
  if (value == null || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) return 'Not recorded';
  const minutes = Math.round(Number(value) * (hours ? 60 : 1));
  if (minutes === 0 && Number(value) > 0) return 'Less than 1 min';
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h}h${m ? ` ${m} min` : ''}` : `${m} min`;
}
