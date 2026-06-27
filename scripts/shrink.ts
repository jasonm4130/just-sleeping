import { mkdir, readdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import sharp from "sharp";

export function targetWidth(w: number, h: number, max: number): number | null {
  const longest = Math.max(w, h);
  if (longest <= max) return null;
  return Math.round((w / longest) * max);
}

export function sanitizeName(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const stem = basename(filename, extname(filename));
  const safe = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safe}${ext === ".jpeg" ? ".jpg" : ext}`;
}

export async function main(
  srcDir: string,
  outDir: string,
): Promise<{ written: number; skipped: number }> {
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(srcDir)).filter((f) => /\.jpe?g$/i.test(f));
  let written = 0,
    skipped = 0;
  for (const file of files) {
    const out = join(outDir, sanitizeName(file));
    try {
      await stat(out);
      skipped++;
      continue;
    } catch {
      /* not built yet */
    }
    const src = join(srcDir, file);
    const meta = await sharp(src).metadata();
    const tw = targetWidth(meta.width ?? 0, meta.height ?? 0, 2000);
    const pipe = sharp(src).rotate(); // respect EXIF orientation
    if (tw) pipe.resize({ width: tw });
    await pipe.jpeg({ quality: 80, mozjpeg: true }).toFile(out);
    written++;
    console.log(
      `  ${file} -> ${sanitizeName(file)}${tw ? ` (w=${tw})` : " (kept size)"}`,
    );
  }
  return { written, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2] ?? `${process.env.HOME}/Downloads/Just Sleeping`;
  const out = process.argv[3] ?? "src/photos/archive";
  const r = await main(src, out);
  console.log(`shrink: ${r.written} written, ${r.skipped} skipped`);
}
