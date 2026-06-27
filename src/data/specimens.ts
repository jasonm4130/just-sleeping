export interface Specimen {
  slug: string; // matches the featured photo filename stem
  name: string;
  issue: string;
  sub: string;
  wake: string;
  rot: string;
  taperot: string;
}

// Seeded from the design. `slug` must match a file in src/photos/featured/<slug>.jpg.
// Jason: swap slugs to the real keeper photos.
export const specimens: Specimen[] = [
  {
    slug: "kevin",
    name: "Kevin",
    issue: "No. 02",
    sub: "pigeon · bus shelter",
    wake: "I WASN'T asleep. I was thinking.",
    rot: "-1.6deg",
    taperot: "-3deg",
  },
  {
    slug: "toad",
    name: "Mr. Toad",
    issue: "No. 03",
    sub: "toad · the allotment",
    wake: "five more minutes.",
    rot: "1.4deg",
    taperot: "2deg",
  },
  {
    slug: "beverley",
    name: "Beverley",
    issue: "No. 04",
    sub: "moth · the windowsill",
    wake: "is it morning? it's always morning.",
    rot: "-1deg",
    taperot: "4deg",
  },
  {
    slug: "twins",
    name: "The Twins",
    issue: "No. 05",
    sub: "two snails · the patio",
    wake: "we nap at our own pace, thanks.",
    rot: "1.8deg",
    taperot: "-2deg",
  },
  {
    slug: "gerald",
    name: "Gerald",
    issue: "No. 06",
    sub: "fox · the lay-by",
    wake: "I'm nocturnal. this is normal.",
    rot: "-1.3deg",
    taperot: "3deg",
  },
  {
    slug: "patch",
    name: "Patch",
    issue: "No. 07",
    sub: "hedgehog · the verge",
    wake: "do NOT unroll me.",
    rot: "1.1deg",
    taperot: "-3deg",
  },
];
