import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeName, targetWidth } from "./shrink.ts";

test("targetWidth scales the longest edge to max, preserving aspect", () => {
  // landscape 4032x3024, max 2000 -> width 2000
  assert.equal(targetWidth(4032, 3024, 2000), 2000);
  // portrait 3024x4032, max 2000 -> width 1500 (height is the long edge)
  assert.equal(targetWidth(3024, 4032, 2000), 1500);
});

test("targetWidth returns null when already within max (no upscale)", () => {
  assert.equal(targetWidth(1600, 1200, 2000), null);
  assert.equal(targetWidth(2000, 1000, 2000), null);
});

test("sanitizeName lowercases and makes URL-safe, keeping extension", () => {
  assert.equal(sanitizeName("EFFECTS(1).jpg"), "effects-1.jpg");
  assert.equal(
    sanitizeName("2012-11-03 13.37.46.jpg"),
    "2012-11-03-13-37-46.jpg",
  );
  assert.equal(
    sanitizeName("PXL_20210806_031831586.MP.jpg"),
    "pxl-20210806-031831586-mp.jpg",
  );
});
