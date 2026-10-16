export const FLOOR = -0.84;
export const RIM = 0.94;
export const DURATION = 11;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smooth = (x, a, b) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// Shared by the cup wall and all liquid surfaces. Keep a gap for motion/refraction.
export const innerRadius = (y) =>
  0.7 + ((clamp(y, -0.88, RIM) + 0.88) / 1.82) * 0.23;
export const liquidRadius = (y) => innerRadius(y) - 0.055;
export function recipeAt(t, strength = "regular") {
  const coffee = smooth(t, 0, 3.5);
  const milk = smooth(t, 3.8, 7.5);
  const foam = smooth(t, 7.8, 10.8);
  const coffeeHeight = strength === "strong" ? 0.65 : 0.44;
  const level = FLOOR + coffee * coffeeHeight + milk * (1.45 - coffeeHeight);
  const foamHeight = 0.13 * foam;
  return {
    coffee,
    milk,
    foam,
    level,
    radius: liquidRadius(level),
    foamHeight,
    foamRadius: liquidRadius(level + foamHeight) - 0.006,
  };
}
