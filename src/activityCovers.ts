import type { EventIcon, ItemKind } from "./model/calendar.js";

export interface ActivityCover { src: string; label: string; author: string; source: string }

export const activityCovers: Record<EventIcon, ActivityCover> = {
  activity: { src: new URL("./assets/activity-covers/activity.jpg", import.meta.url).href, label: "Sentiero nel bosco", author: "Annie Spratt", source: "https://unsplash.com/photos/KpYvNH3IPVw" },
  work: { src: new URL("./assets/activity-covers/work.jpg", import.meta.url).href, label: "Scrivania e computer", author: "LOGAN WEAVER", source: "https://unsplash.com/photos/xjyHDnA93Pk" },
  study: { src: new URL("./assets/activity-covers/study.jpg", import.meta.url).href, label: "Quaderno e libri", author: "Finde Zukunft", source: "https://unsplash.com/photos/TPB-0YtXHlY" },
  sport: { src: new URL("./assets/activity-covers/sport.jpg", import.meta.url).href, label: "Pesi in palestra", author: "Delaney Van", source: "https://unsplash.com/photos/I72QeY20Q7o" },
  rest: { src: new URL("./assets/activity-covers/rest.jpg", import.meta.url).href, label: "Natura e relax", author: "Byron Johnson", source: "https://unsplash.com/photos/NCfBs3v8iBQ" },
  meal: { src: new URL("./assets/activity-covers/meal.jpg", import.meta.url).href, label: "Colazione e caffè", author: "Marco Palumbo", source: "https://unsplash.com/photos/-H2EGDd-r9g" },
  people: { src: new URL("./assets/activity-covers/people.jpg", import.meta.url).href, label: "Incontri tra amici", author: "Vitaly Gariev", source: "https://unsplash.com/photos/2VkUdNANwdA" },
  heart: { src: new URL("./assets/activity-covers/heart.svg", import.meta.url).href, label: "Cuore e benessere", author: "Illustrazione dell’app", source: "" },
  gaming: { src: new URL("./assets/activity-covers/gaming.svg", import.meta.url).href, label: "Controller per videogiochi", author: "Illustrazione dell’app", source: "" },
};

/** Copertine dedicate ai blocchi fissi, distinte dalle immagini motivazionali. */
export const fixedEventCovers: Record<EventIcon, ActivityCover> = {
  activity: { src: new URL("./assets/fixed-event-covers/activity.jpg", import.meta.url).href, label: "Agenda e orologio", author: "Immagine generata per l’app", source: "" },
  work: { src: new URL("./assets/fixed-event-covers/work.jpg", import.meta.url).href, label: "Sala riunioni", author: "Immagine generata per l’app", source: "" },
  study: { src: new URL("./assets/fixed-event-covers/study.jpg", import.meta.url).href, label: "Biblioteca e studio", author: "Immagine generata per l’app", source: "" },
  sport: { src: new URL("./assets/fixed-event-covers/sport.jpg", import.meta.url).href, label: "Campo da gioco", author: "Immagine generata per l’app", source: "" },
  rest: { src: new URL("./assets/fixed-event-covers/rest.jpg", import.meta.url).href, label: "Riposo programmato", author: "Immagine generata per l’app", source: "" },
  meal: { src: new URL("./assets/fixed-event-covers/meal.jpg", import.meta.url).href, label: "Tavolo riservato", author: "Immagine generata per l’app", source: "" },
  people: { src: new URL("./assets/fixed-event-covers/people.jpg", import.meta.url).href, label: "Incontro al caffè", author: "Immagine generata per l’app", source: "" },
  heart: { src: new URL("./assets/fixed-event-covers/heart.jpg", import.meta.url).href, label: "Appuntamento per la salute", author: "Immagine generata per l’app", source: "" },
  gaming: activityCovers.gaming,
};

/** Restituisce la copertina coerente con il tipo e l'icona dell'evento. */
export function eventCover(kind: ItemKind, icon: EventIcon): ActivityCover {
  return kind === "fixed" ? fixedEventCovers[icon] : activityCovers[icon];
}
