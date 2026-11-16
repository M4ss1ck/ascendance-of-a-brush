/**
 * 32-bit FNV-1a over raw bytes, as 8 lowercase hex digits.
 *
 * Ported from `fnv` in docs/reference/brush-bench.html. Used by the determinism
 * tests to compare rendered pixels (ImageData.data) without storing full images.
 */
export function fnv1a(bytes: ArrayLike<number>): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
