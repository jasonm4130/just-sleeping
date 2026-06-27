// Generate zine content for each archive photo via Moonshot vision.
// Reads MOONSHOT_API_KEY from env. Resumable: skips photos already in the output JSON.
//
//   node scripts/caption.ts                 # caption all src/photos/archive/*.jpg
//   node scripts/caption.ts a.jpg b.jpg     # caption just these (names relative to archive dir)
//   CAPTION_LIMIT=3 node scripts/caption.ts  # cap how many NEW photos to process this run

import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const API_KEY = process.env.MOONSHOT_API_KEY;
if (!API_KEY) {
  console.error("MOONSHOT_API_KEY not set in env");
  process.exit(1);
}

const BASE_URL = "https://api.moonshot.ai/v1";
const MODEL = "moonshot-v1-8k-vision-preview";
const ARCHIVE = "src/photos/archive";
const OUT = "scripts/captions.json";
const CONCURRENCY = 4;

export interface Caption {
  file: string;
  species: string;
  name: string;
  location: string;
  wakeLine: string;
  caption: string;
}

const SYSTEM = `You write copy for "They're Just Sleeping", a deadpan British photo-zine. The conceit: small animals (pets, birds, wildlife) are photographed lying very still — they are NOT dead, they are "just sleeping". The voice is dry, gentle, absurd, very British. Never morbid, never cute-overload.

For the animal in the photo, return STRICT JSON with these fields:
- "species": the animal in 1-3 lowercase words (e.g. "cat", "tabby cat", "wood pigeon", "common toad"). Best guess if unclear.
- "name": one ordinary, slightly old-fashioned British human first name that suits it (e.g. Kevin, Beverley, Gerald, Margaret, Derek, Sandra, Malcolm, Doreen, Nigel, Pam). Vary it across specimens; avoid repeating the same few names. Just the name.
- "location": a mundane, deadpan everyday British place, lowercase (e.g. "the bus shelter", "the allotment", "a sunny windowsill", "the kitchen floor", "the verge", "behind the bins"). Invent something fitting.
- "wakeLine": a SHORT first-person line (max ~8 words), as if the animal insists it wasn't asleep. VARY the register and structure across specimens — defensive, grumpy, philosophical, in denial, indignant, sleepy. Do NOT start every line with "just". The range: "I WASN'T asleep. I was thinking.", "five more minutes.", "do NOT unroll me.", "is it morning? it's always morning.", "this is my spot. always has been.", "I heard everything you said.", "resting is a full-time job.", "I'm nocturnal. this is normal."
- "caption": a very short deadpan archive caption, STRICTLY lowercase, max 6 words (e.g. "resting his eyes, and everything else", "committed to the bit", "deeply unbothered").

Write everything in ENGLISH only — never use non-English characters, words, or scripts. Return ONLY the JSON object, no prose.`;

async function captionOne(file: string): Promise<Caption> {
  const bytes = await readFile(join(ARCHIVE, file));
  const dataUri = `data:image/jpeg;base64,${bytes.toString("base64")}`;
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUri } },
            { type: "text", text: "Caption this sleeping specimen." },
          ],
        },
      ],
    }),
  });
  if (!res.ok)
    throw new Error(`${file}: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  const parsed = JSON.parse(json.choices[0].message.content);
  return { file, ...parsed };
}

async function main() {
  const argv = process.argv.slice(2);
  const all = argv.length
    ? argv.map((f) => basename(f))
    : (await readdir(ARCHIVE)).filter((f) => /\.jpe?g$/i.test(f)).sort();

  const done: Record<string, Caption> = existsSync(OUT)
    ? JSON.parse(readFileSync(OUT, "utf8"))
    : {};

  let todo = all.filter((f) => !done[f]);
  const limit = Number(process.env.CAPTION_LIMIT ?? "0");
  if (limit > 0) todo = todo.slice(0, limit);
  console.log(
    `${all.length} total, ${all.length - todo.length} cached, ${todo.length} to caption`,
  );

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(captionOne));
    for (const r of results) {
      if (r.status === "fulfilled") {
        done[r.value.file] = r.value;
        ok++;
        console.log(
          `  ✓ ${r.value.file} → ${r.value.name} the ${r.value.species}: "${r.value.wakeLine}"`,
        );
      } else {
        fail++;
        console.error(`  ✗ ${r.reason.message.slice(0, 120)}`);
      }
    }
    await writeFile(OUT, JSON.stringify(done, null, 2)); // checkpoint after each batch
  }
  console.log(
    `done: ${ok} ok, ${fail} failed, ${Object.keys(done).length} total in ${OUT}`,
  );
}

main();
