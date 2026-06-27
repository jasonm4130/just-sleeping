import assert from "node:assert/strict";
import { test } from "node:test";
import { pokeLineFor } from "./poke.ts";

test("pokeLineFor returns the design's escalating lines", () => {
  assert.equal(pokeLineFor(0), "psst — go on, poke him. he won't mind.");
  assert.equal(pokeLineFor(1), "…see? nothing. completely peaceful.");
  assert.equal(pokeLineFor(2), "still asleep. impressively committed to it.");
  assert.equal(pokeLineFor(3), "okay he's REALLY sleeping now. ease off.");
  assert.equal(
    pokeLineFor(5),
    "you've poked Gary 5 times. he's still not getting up.",
  );
  assert.equal(
    pokeLineFor(7),
    "Gary has filed a complaint. (he's asleep, but still.)",
  );
  assert.equal(
    pokeLineFor(99),
    "Gary has filed a complaint. (he's asleep, but still.)",
  );
});
