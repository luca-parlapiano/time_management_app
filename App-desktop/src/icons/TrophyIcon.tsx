export type TrophyIconVariant = 'steps' | 'time';

interface TrophyIconProps {
  variant: TrophyIconVariant;
  size?: number;
}

/** Icone vettoriali locali per la raccolta: coppa per gli step e medaglia-orologio per il tempo. */
export function TrophyIcon({ variant, size = 68 }: TrophyIconProps) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {variant === 'steps' ? <>
      <path d="M20 10h24v15c0 8-5 14-12 14s-12-6-12-14V10Z" />
      <path d="M20 15H10v6c0 8 5 13 13 13M44 15h10v6c0 8-5 13-13 13M32 39v10M22 55h20M26 49h12v6" />
      <path d="m27 25 4 4 7-8" />
    </> : <>
      <circle cx="32" cy="25" r="16" />
      <path d="M32 16v10l7 4M22 38l-5 17 15-7 15 7-5-17" />
      <path d="M25 9 21 3M39 9l4-6" />
    </>}
  </svg>;
}
