// Vector reconstruction of the supplied A+ Design Group mark.
export const markPath =
  "M462 513V322C462 251 404 192 333 192C262 192 204 251 204 322C204 393 262 453 333 453H390V513H333C228 513 143 428 143 322C143 217 228 131 333 131C438 131 523 217 523 322V513Z";
export const plusPath =
  "M590 81H623L631 134L684 142V175L631 183L623 237H590L582 183L529 175V142L582 134Z";
export function createArtTexture(THREE, kind) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const c = canvas.getContext("2d");
  c.fillStyle = "#b17c45";
  if (kind === "logo") {
    c.translate(-23, 18);
    c.scale(0.73, 0.73);
    c.fill(new Path2D(markPath));
    c.fill(new Path2D(plusPath));
  } else if (kind === "star") {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5,
        r = i % 2 ? 77 : 175;
      const x = 256 + Math.cos(a) * r,
        y = 260 + Math.sin(a) * r;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
    c.fill();
  } else {
    c.beginPath();
    c.moveTo(256, 406);
    c.bezierCurveTo(38, 251, 86, 78, 216, 143);
    c.bezierCurveTo(238, 155, 249, 174, 256, 190);
    c.bezierCurveTo(302, 75, 468, 115, 430, 247);
    c.bezierCurveTo(413, 305, 325, 369, 256, 406);
    c.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
