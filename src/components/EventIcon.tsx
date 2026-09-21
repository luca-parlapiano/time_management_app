import type { EventIcon as IconName } from "../domain/calendar";

const paths: Record<IconName, string> = {
  activity: "m5 12 4 4L19 6",
  work: "M4 7h16v13H4z M8 7V4h8v3 M4 12h16 M10 12v3h4v-3",
  study: "M12 6C8 3 4 4 2 5v14c4-2 7-1 10 1 3-2 6-3 10-1V5c-2-1-6-2-10 1Zm0 0v14",
  sport: "m7 3-4 4m14 14 4-4M5 5l14 14M3 11l8-8m2 18 8-8",
  rest: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z",
  meal: "M4 3v6c0 3 6 3 6 0V3M7 3v18M20 21V3c-5 2-5 11 0 11",
  people: "M9 7a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM2 21v-4a4 4 0 0 1 8 0v4M21 7a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm-7 14v-4a4 4 0 0 1 8 0v4",
  heart: "M20 5c-3-3-6-1-8 1-2-2-5-4-8-1s-1 7 8 15c9-8 11-12 8-15Z",
};

export function EventIcon({ icon }: { icon: IconName }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[icon]} /></svg>;
}
