import { CatmullRomCurve3, Vector3, TubeGeometry } from "three";

export function createHandleGeometry() {
  // Both attachment points sit in the outer wall. The curve never enters the cavity.
  const outsideRadius = (y) => 0.78 + ((y + 1) / 1.94) * 0.22;
  const path = new CatmullRomCurve3(
    [
      new Vector3(outsideRadius(0.55) + 0.045, 0.55, 0),
      new Vector3(1.26, 0.59, 0),
      new Vector3(1.54, 0.37, 0),
      new Vector3(1.6, 0.02, 0),
      new Vector3(1.44, -0.35, 0),
      new Vector3(outsideRadius(-0.5) + 0.045, -0.5, 0),
    ],
    false,
    "centripetal",
  );
  return new TubeGeometry(path, 80, 0.085, 16, false);
}
