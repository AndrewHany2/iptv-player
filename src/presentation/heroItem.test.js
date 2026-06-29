import { test } from "node:test";
import assert from "node:assert/strict";
import { selectHeroItem } from "./heroItem.js";

test("returns null for null / undefined / non-array input", () => {
  assert.equal(selectHeroItem(null), null);
  assert.equal(selectHeroItem(undefined), null);
  assert.equal(selectHeroItem("nope"), null);
  assert.equal(selectHeroItem({}), null);
});

test("returns null for an empty list", () => {
  assert.equal(selectHeroItem([]), null);
});

test("picks the first item that has an image", () => {
  const noArt = { name: "A" };
  const withArt = { name: "B", backdrop_path: "http://x/b.jpg" };
  const alsoArt = { name: "C", cover: "http://x/c.jpg" };
  assert.equal(selectHeroItem([noArt, withArt, alsoArt]), withArt);
});

test("recognises any of backdrop_path / cover / movie_image / stream_icon", () => {
  assert.equal(selectHeroItem([{ cover: "c.jpg" }]).cover, "c.jpg");
  assert.equal(selectHeroItem([{ movie_image: "m.jpg" }]).movie_image, "m.jpg");
  assert.equal(selectHeroItem([{ stream_icon: "s.jpg" }]).stream_icon, "s.jpg");
});

test("falls back to the first item when none have images", () => {
  const first = { name: "first" };
  const second = { name: "second" };
  assert.equal(selectHeroItem([first, second]), first);
});

test("treats empty-string image fields as no image", () => {
  const blank = { name: "blank", backdrop_path: "", cover: "   " };
  const real = { name: "real", cover: "r.jpg" };
  assert.equal(selectHeroItem([blank, real]), real);
  // and when none are real, still falls back to the first
  assert.equal(selectHeroItem([blank]), blank);
});

test("ignores undefined / null entries", () => {
  const withArt = { name: "B", stream_icon: "b.jpg" };
  assert.equal(selectHeroItem([undefined, null, withArt]), withArt);
  // first usable skips the holes too
  const plain = { name: "plain" };
  assert.equal(selectHeroItem([null, undefined, plain]), plain);
});
