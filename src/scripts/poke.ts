export function pokeLineFor(p: number): string {
  if (p === 0) return "psst — go on, poke him. he won't mind.";
  if (p === 1) return "…see? nothing. completely peaceful.";
  if (p === 2) return "still asleep. impressively committed to it.";
  if (p === 3) return "okay he's REALLY sleeping now. ease off.";
  if (p < 7) return `you've poked Gary ${p} times. he's still not getting up.`;
  return "Gary has filed a complaint. (he's asleep, but still.)";
}
