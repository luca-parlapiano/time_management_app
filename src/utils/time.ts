export function formatTimeWithMeridiem(time: string) {
  const [rawHours, rawMinutes] = time.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const normalizedDayHours = ((hours % 24) + 24) % 24;
  const period = normalizedDayHours >= 12 ? "PM" : "AM";
  const normalizedHours =
    normalizedDayHours % 12 === 0 ? 12 : normalizedDayHours % 12;
  const normalizedMinutes = minutes.toString().padStart(2, "0");

  return `${normalizedHours}:${normalizedMinutes} ${period}`;
}

export function formatTimeRange(start: string, end: string) {
  return `${formatTimeWithMeridiem(start)} - ${formatTimeWithMeridiem(end)}`;
}
