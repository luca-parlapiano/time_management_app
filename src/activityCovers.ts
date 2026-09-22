import type { EventIcon } from "./domain/calendar";

export const activityCovers: Record<EventIcon, { src: string; label: string; author: string; source: string }> = {
  activity: { src: new URL("./assets/activity-covers/activity.jpg", import.meta.url).href, label: "Sentiero nel bosco", author: "Annie Spratt", source: "https://unsplash.com/photos/KpYvNH3IPVw" },
  work: { src: new URL("./assets/activity-covers/work.jpg", import.meta.url).href, label: "Scrivania e computer", author: "LOGAN WEAVER", source: "https://unsplash.com/photos/xjyHDnA93Pk" },
  study: { src: new URL("./assets/activity-covers/study.jpg", import.meta.url).href, label: "Quaderno e libri", author: "Finde Zukunft", source: "https://unsplash.com/photos/TPB-0YtXHlY" },
  sport: { src: new URL("./assets/activity-covers/sport.jpg", import.meta.url).href, label: "Pesi in palestra", author: "Delaney Van", source: "https://unsplash.com/photos/I72QeY20Q7o" },
  rest: { src: new URL("./assets/activity-covers/rest.jpg", import.meta.url).href, label: "Natura e relax", author: "Byron Johnson", source: "https://unsplash.com/photos/NCfBs3v8iBQ" },
  meal: { src: new URL("./assets/activity-covers/meal.jpg", import.meta.url).href, label: "Colazione e caffè", author: "Marco Palumbo", source: "https://unsplash.com/photos/-H2EGDd-r9g" },
  people: { src: new URL("./assets/activity-covers/people.jpg", import.meta.url).href, label: "Incontri tra amici", author: "Vitaly Gariev", source: "https://unsplash.com/photos/2VkUdNANwdA" },
  heart: { src: new URL("./assets/activity-covers/heart.svg", import.meta.url).href, label: "Cuore e benessere", author: "Illustrazione dell’app", source: "" },
};
