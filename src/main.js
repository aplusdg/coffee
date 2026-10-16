import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  FLOOR,
  DURATION,
  liquidRadius,
  recipeAt,
  getRecipe,
  smooth,
} from "./recipe.js";
import { createHandleGeometry } from "./cup-geometry.js";
import { createArtTexture } from "./brand.js";
import { buildOrder } from "./order.js";
import { sendNotification } from "./notifications.js";
import "./style.css";

const $ = (selector) => document.querySelector(selector);
const state = {
  emailStatus: "idle",
  temperature: "hot",
  coffee: "cappuccino",
  art: "heart",
  timing: "now",
  phase: "idle",
  elapsed: 0,
  readyAt: 0,
};
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let resetScene = () => {},
  beginScene = () => {};
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch {
  $("#fallback").hidden = false;
}
if (renderer) initScene();
initControls();
initOrders();
reset();

function initScene() {
  const host = $("#scene");
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(4.8, 6.4, 7.6);
  camera.lookAt(0, 0.2, 0);
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfff8ea, 0x8c7961, 2.3));
  const key = new THREE.DirectionalLight(0xfff7e5, 3);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 1.6);
  fill.position.set(4, 3, -4);
  scene.add(fill);
  const rig = new THREE.Group();
  scene.add(rig);
  const cup = new THREE.Group();
  rig.add(cup);
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0xe9e3d7,
    roughness: 0.27,
    clearcoat: 0.7,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xe9f0ec,
    roughness: 0.1,
    transmission: 0.55,
    thickness: 0.045,
    ior: 1.45,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    envMapIntensity: 0.55,
    specularIntensity: 0.45,
    side: THREE.DoubleSide,
  });
  const coffeeMat = new THREE.MeshPhysicalMaterial({
    color: 0x42200f,
    roughness: 0.26,
    clearcoat: 0.65,
    transparent: true,
    depthWrite: false,
  });
  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xffefd4,
    roughness: 0.86,
  });
  // The inner wall is linear from radius .70 at y=-.88 to .93 at y=.94.
  const profile = [
    [0, -1.05],
    [0.72, -1.05],
    [0.78, -1],
    [1, 0.94],
    [0.985, 0.98],
    [0.94, 0.98],
    [0.93, 0.94],
    [0.7, -0.88],
    [0, -0.88],
  ].map((p) => new THREE.Vector2(...p));
  const vessel = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), ceramic);
  vessel.castShadow = true;
  vessel.receiveShadow = true;
  cup.add(vessel);
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xa5b7ad,
    roughness: 0.2,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const glassRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.956, 0.012, 8, 96),
    rimMaterial,
  );
  glassRim.rotation.x = -Math.PI / 2;
  glassRim.position.y = 0.969;
  cup.add(glassRim);
  const glassFoot = new THREE.Mesh(
    new THREE.TorusGeometry(0.727, 0.012, 8, 96),
    rimMaterial,
  );
  glassFoot.rotation.x = -Math.PI / 2;
  glassFoot.position.y = -1.03;
  cup.add(glassFoot);

  const handle = new THREE.Mesh(createHandleGeometry(), ceramic);
  handle.castShadow = true;
  cup.add(handle);
  const saucer = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0, -1.18],
        [0.9, -1.18],
        [1.55, -1.13],
        [1.67, -1.06],
        [1.66, -1.01],
        [1.5, -1.04],
        [0.95, -1.1],
        [0, -1.1],
      ].map((p) => new THREE.Vector2(...p)),
      96,
    ),
    ceramic,
  );
  saucer.receiveShadow = true;
  rig.add(saucer);
  const liquid = new THREE.Group();
  cup.add(liquid);
  const bodyGeometry = new THREE.CylinderGeometry(1, 1, 1, 80);
  const originalPositions = bodyGeometry.attributes.position.array.slice();
  const body = new THREE.Mesh(bodyGeometry, coffeeMat);
  liquid.add(body);
  const top = new THREE.Mesh(new THREE.CircleGeometry(1, 96), coffeeMat);
  top.rotation.x = -Math.PI / 2;
  liquid.add(top);
  // Foam and decoration share a surface-centered pivot, never the cup's origin.
  const foamSurface = new THREE.Group();
  liquid.add(foamSurface);
  const foam = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.13, 80),
    foamMat,
  );
  foamSurface.add(foam);
  const foamTop = new THREE.Group();
  foamSurface.add(foamTop);
  let seed = 18;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const bubbles = new THREE.Group();
  foamTop.add(bubbles);
  for (let i = 0; i < 70; i++) {
    const a = random() * Math.PI * 2,
      r = Math.sqrt(random()) * 0.94;
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.006 + random() * 0.009, 6, 4),
      foamMat,
    );
    b.position.set(Math.cos(a) * r, 0.002, Math.sin(a) * r);
    b.scale.y = 0.25;
    bubbles.add(b);
  }
  const artTextures = Object.fromEntries(
    ["heart", "star", "logo"].map((kind) => [
      kind,
      createArtTexture(THREE, kind),
    ]),
  );
  const artMaterial = new THREE.MeshBasicMaterial({
    map: artTextures.heart,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 1.28), artMaterial);
  art.rotation.x = -Math.PI / 2;
  art.rotation.z = 0.91;
  art.position.y = 0.006;
  foamTop.add(art);
  // This ring follows the actual inner radius at the current foam height.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.955, 0.977, 96),
    new THREE.MeshBasicMaterial({
      color: 0xc5955e,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.003;
  foamTop.add(ring);
  const iceGroup = new THREE.Group();
  cup.add(iceGroup);
  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xe4f5ff,
    vertexColors: true,
    transmission: 0.98,
    roughness: 0.018,
    thickness: 0.18,
    ior: 1.31,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    envMapIntensity: 0.75,
    attenuationColor: 0x86c8dc,
    attenuationDistance: 1.5,
  });
  const iceGeometry = new RoundedBoxGeometry(0.29, 0.27, 0.29, 3, 0.035);
  // Cooler side faces make clear ice legible over white foam without wire outlines.
  const iceNormals = iceGeometry.attributes.normal;
  const iceColors = new Float32Array(iceNormals.count * 3);
  const coolSide = new THREE.Color(0x4e9fbf),
    clearTop = new THREE.Color(0xe3f8ff);
  for (let i = 0; i < iceNormals.count; i++) {
    const tint = coolSide.clone().lerp(clearTop, Math.abs(iceNormals.getY(i)));
    iceColors.set([tint.r, tint.g, tint.b], i * 3);
  }
  iceGeometry.setAttribute("color", new THREE.BufferAttribute(iceColors, 3));

  const bubbleGeometry = new THREE.SphereGeometry(0.007, 6, 5);
  const iceBubbleMaterial = new THREE.MeshBasicMaterial({
    color: 0xe7f8ff,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(iceGeometry, iceMat);
    m.userData = { a: (i * Math.PI * 2) / 5, phase: i };
    m.rotation.set(0.1 + i * 0.07, i, 0.1);
    for (let j = 0; j < 3; j++) {
      const bubble = new THREE.Mesh(bubbleGeometry, iceBubbleMaterial);
      bubble.position.set(
        (j - 1) * 0.035,
        ((i % 3) - 1) * 0.025,
        (j % 2 ? 1 : -1) * 0.035,
      );
      m.add(bubble);
    }
    iceGroup.add(m);
  }
  // A moving, tapered stream falls from above the rim into the center of the cup.
  const flowCanvas = document.createElement("canvas");
  flowCanvas.width = 64;
  flowCanvas.height = 256;
  const flowContext = flowCanvas.getContext("2d");
  flowContext.fillStyle = "#888";
  flowContext.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 180; i++) {
    const shade = 90 + ((i * 47) % 120);
    flowContext.fillStyle = `rgb(${shade},${shade},${shade})`;
    flowContext.fillRect(
      (i * 19) % 64,
      (i * 37) % 256,
      1 + (i % 3),
      12 + (i % 23),
    );
  }
  const flowTexture = new THREE.CanvasTexture(flowCanvas);
  flowTexture.wrapS = flowTexture.wrapT = THREE.RepeatWrapping;
  flowTexture.repeat.set(2, 3);
  const streamGeometry = new THREE.CylinderGeometry(1, 1, 1, 24, 28, true);
  const streamOriginal = streamGeometry.attributes.position.array.slice();
  const streamMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x512b15,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    bumpMap: flowTexture,
    bumpScale: 0.018,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  });
  const stream = new THREE.Mesh(streamGeometry, streamMaterial);
  stream.visible = false;
  cup.add(stream);
  const droplets = new THREE.Group();
  cup.add(droplets);
  const dropletGeometry = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 5; i++)
    droplets.add(new THREE.Mesh(dropletGeometry, streamMaterial));

  const ripples = new THREE.Group();
  cup.add(ripples);
  for (let i = 0; i < 2; i++) {
    const ripple = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.025, 5, 48),
      new THREE.MeshBasicMaterial({
        color: 0xe4c49c,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    ripple.rotation.x = -Math.PI / 2;
    ripples.add(ripple);
  }
  const steam = new THREE.Group();
  cup.add(steam);
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const c = canvas.getContext("2d");
  const gradient = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = gradient;
  c.fillRect(0, 0, 64, 64);
  const steamTexture = new THREE.CanvasTexture(canvas);
  for (let i = 0; i < 12; i++) {
    steam.add(
      new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.4),
        new THREE.MeshBasicMaterial({
          map: steamTexture,
          transparent: true,
          depthWrite: false,
          opacity: 0,
          side: THREE.DoubleSide,
        }),
      ),
    );
  }
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(2.5, 80),
    new THREE.ShadowMaterial({ opacity: 0.08 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.2;
  ground.receiveShadow = true;
  scene.add(ground);
  let yaw = -0.35,
    targetYaw = -0.35,
    pitch = 0,
    targetPitch = 0,
    hover = 0,
    impulse = 0,
    drag = false,
    lastX = 0,
    lastY = 0,
    time = 0;
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();
  host.addEventListener("pointerdown", (e) => {
    drag = true;
    lastX = e.clientX;
    lastY = e.clientY;
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener("pointermove", (e) => {
    if (drag) {
      const dx = e.clientX - lastX;
      targetYaw += dx * 0.009;
      targetPitch = THREE.MathUtils.clamp(
        targetPitch + (e.clientY - lastY) * 0.004,
        -0.22,
        0.22,
      );
      impulse = THREE.MathUtils.clamp(dx * 0.001, -0.02, 0.02);
      lastX = e.clientX;
      lastY = e.clientY;
    } else if (!reduced) hover = 0.018;
  });
  const release = () => {
    drag = false;
  };
  host.addEventListener("pointerup", release);
  host.addEventListener("pointercancel", release);
  host.addEventListener("pointerleave", () => {
    hover = 0;
  });
  resetScene = () => {
    const iced = state.temperature === "iced";
    vessel.material = iced ? glass : ceramic;
    vessel.castShadow = !iced;
    handle.visible = !iced;
    glassRim.visible = iced;
    glassFoot.visible = iced;
    saucer.visible = !iced;
    cup.scale.set(iced ? 0.76 : 1, iced ? 1.22 : 1, iced ? 0.76 : 1);
    cup.position.y = iced ? 0.231 : 0;
    artMaterial.map = artTextures[state.art];
    artMaterial.needsUpdate = true;
  };
  beginScene = () => {
    state.readyAt = 0;
  };
  function updateLiquid(level) {
    const position = bodyGeometry.attributes.position;
    const height = Math.max(0.001, level - FLOOR),
      bottom = liquidRadius(FLOOR),
      upper = liquidRadius(level);
    for (let i = 0; i < position.count; i++) {
      const j = i * 3;
      const isTop = originalPositions[j + 1] > 0;
      const radius = isTop ? upper : bottom;
      position.setXYZ(
        i,
        originalPositions[j] * radius,
        isTop ? level : FLOOR,
        originalPositions[j + 2] * radius,
      );
    }
    position.needsUpdate = true;
    bodyGeometry.computeVertexNormals();
    top.position.y = level + 0.002;
    top.scale.setScalar(upper);
    return height;
  }
  let lastLevel = NaN;
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = clock.getDelta();
    time += dt;
    advancePreparation(dt, time);
    const t = state.elapsed,
      {
        amounts,
        coffee: coffeeP,
        pour,
        foam: foamP,
        level,
        radius,
        foamHeight,
        foamRadius,
      } = recipeAt(t, state.coffee, state.temperature);
    const active = state.phase !== "idle";
    liquid.visible = active;
    if (level !== lastLevel) {
      updateLiquid(level);
      lastLevel = level;
    }
    const milkFraction =
      amounts.milk / Math.max(1, amounts.espresso + amounts.milk);
    const black = state.coffee === "long-black";
    if (black) {
      coffeeMat.color.set(0xd9ebe7).lerp(new THREE.Color(0x3e2113), coffeeP);
      coffeeMat.opacity = 0.16 + 0.84 * coffeeP;
    } else {
      coffeeMat.color
        .set(0x45220f)
        .lerp(new THREE.Color(0xe0bc87), Math.pow(milkFraction, 0.9) * 0.96);
      coffeeMat.opacity = 1;
    }
    const motion = reduced ? 0 : Math.sin(time * 3) * (0.004 + hover) + impulse;
    top.rotation.x = -Math.PI / 2 + motion * 0.4;
    foamSurface.visible = foamP > 0;
    foamSurface.position.y = level;
    foamSurface.rotation.x = motion * 0.4;
    foam.scale.set(foamRadius, Math.max(0.001, foamHeight / 0.13), foamRadius);
    foam.position.y = foamHeight / 2;
    foamTop.position.y = foamHeight + 0.003;
    foamTop.scale.setScalar(foamRadius);
    foamTop.visible = foamP > 0.55;
    art.scale.setScalar(smooth(foamP, 0.55, 1));
    const pouring = state.phase === "making" && Boolean(pour);
    stream.visible = pouring;
    ripples.visible = pouring;
    droplets.visible = pouring;
    if (pouring) {
      const bottom = level + foamHeight,
        topY = 1.78,
        height = topY - bottom;
      const phaseStart = pour.start,
        phaseEnd = pour.end;
      const envelope = Math.min(
        smooth(t, phaseStart, phaseStart + 0.18),
        1 - smooth(t, phaseEnd - 0.18, phaseEnd),
      );
      const positions = streamGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const j = i * 3,
          fraction = streamOriginal[j + 1] + 0.5;
        const wave =
          Math.sin(time * 18 - fraction * 17) * 0.16 +
          Math.sin(time * 27 - fraction * 31) * 0.08;
        const width =
          (0.076 + (1 - fraction) * 0.013) *
          (1 + wave) *
          Math.max(0.01, envelope);
        positions.setXYZ(
          i,
          0.12 +
            streamOriginal[j] * width +
            Math.sin(fraction * 13 - time * 15) * 0.012,
          bottom + fraction * height,
          -0.08 + streamOriginal[j + 2] * width,
        );
      }
      positions.needsUpdate = true;
      streamGeometry.computeVertexNormals();
      stream.material.color.set(
        pour.type === "espresso"
          ? 0x512b15
          : pour.type === "water"
            ? 0xe1f0ee
            : pour.type === "milk"
              ? 0xf4e5cd
              : 0xffefd4,
      );
      stream.material.opacity = pour.type === "water" ? 0.48 : 0.94;
      flowTexture.offset.y = -time * 1.7;
      droplets.children.forEach((m, i) => {
        const fall = (time * 1.6 + i / 5) % 1;
        m.position.set(
          0.12 + Math.sin(i * 2.4) * 0.075,
          bottom + (1 - fall) * height,
          -0.08 + Math.cos(i * 2.4) * 0.045,
        );
        m.scale.set(0.021, 0.052, 0.021);
      });

      ripples.children.forEach((m, i) => {
        const age = (time * 1.8 + i / 2) % 1;
        m.position.set(0.12, bottom + 0.008, -0.08);
        m.scale.setScalar(0.045 + age * 0.12);
        m.material.opacity = (1 - age) * 0.2;
        m.material.color.set(pour.type === "espresso" ? 0xc28d54 : 0xf8edd9);
      });
    }
    iceGroup.visible = state.temperature === "iced" && active;
    for (const m of iceGroup.children) {
      const { a, phase } = m.userData;
      const orbit = Math.min(0.58, radius - 0.27);
      m.position.set(
        Math.cos(a) * orbit + Math.sin(time + phase) * hover,
        Math.max(FLOOR + 0.22, level + 0.06 * foamP) +
          Math.sin(time * 1.4 + phase) * 0.012,
        Math.sin(a) * orbit,
      );
      m.rotation.z = Math.sin(time + phase) * 0.055 + impulse;
    }
    steam.visible =
      state.temperature === "hot" && state.phase === "ready" && !reduced;
    steam.children.forEach((m, i) => {
      const age = ((time - state.readyAt) * 0.2 + i / 12) % 1;
      m.position.set(
        Math.sin(age * 4 + i) * 0.13,
        level + foamHeight + 0.08 + age * 0.95,
        Math.cos(i * 2) * 0.12,
      );
      m.scale.setScalar(0.3 + age * 0.65);
      m.material.opacity = Math.sin(age * Math.PI) * 0.25;
      m.quaternion.copy(camera.quaternion);
    });
    yaw += (targetYaw - yaw) * 0.08;
    pitch += (targetPitch - pitch) * 0.08;
    rig.rotation.set(pitch, yaw, reduced ? 0 : Math.sin(time * 2.5) * hover);
    hover *= 0.96;
    impulse *= 0.94;
    renderer.render(scene, camera);
  }
  resetScene();
  frame();
}
function setInteractionLock() {
  const busy = state.phase === "making" || state.emailStatus === "sending";
  $("#make").disabled = busy;
  document
    .querySelectorAll(".panel .choices button, #customer-name")
    .forEach((el) => (el.disabled = busy));
  $("#pickup-time").disabled = busy || state.timing !== "custom";
  $("#retry-notification").disabled = busy;
  if (busy)
    $("#make").innerHTML =
      "Making your moment <span aria-hidden='true' class='spinner-icon'></span>";
  else
    $("#make").innerHTML =
      state.phase === "ready"
        ? "Make another <span aria-hidden='true' class='replay-icon'></span>"
        : "Make my coffee <span aria-hidden='true' class='arrow-icon'></span>";
}
function reset() {
  state.phase = "idle";
  state.elapsed = 0;
  $("#status").textContent = "Good things take a little time.";
  $("#progress-fill").style.width = "0%";
  $(".progress").setAttribute("aria-valuenow", "0");
  const recipe = getRecipe(state.coffee, state.temperature);
  $("#cup-label").textContent =
    `${state.temperature === "hot" ? "HOT" : "ICED"} ${recipe.name.toUpperCase()}`;
  $("#recipe-label").textContent = recipe.ratioLabel;
  $("#recipe-ratio").textContent = recipe.ratio;
  $("#coffee-description").textContent = recipe.description;
  $("#art-field").hidden = !recipe.hasMilk;
  setInteractionLock();
  resetScene();
}
function clearNotification() {
  if (state.emailStatus === "sending") return;
  state.emailStatus = "idle";
  $("#notification-status").textContent = "";
  $("#retry-notification").hidden = true;
}
function initControls() {
  for (const id of ["temperature", "coffee", "art", "timing"])
    $(`#${id}`).addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button || button.disabled || state[id] === button.dataset.value)
        return;
      state[id] = button.dataset.value;
      for (const b of $(`#${id}`).querySelectorAll("button")) {
        b.classList.toggle("selected", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      }
      clearNotification();
      if (id === "timing") {
        $("#custom-time-field").hidden = state.timing !== "custom";
        $("#pickup-time").required = state.timing === "custom";
        setInteractionLock();
        return;
      }
      reset();
    });
  if (!renderer) {
    let last = performance.now();
    setInterval(() => {
      const now = performance.now();
      advancePreparation((now - last) / 1000, now / 1000);
      last = now;
    }, 100);
  }
}
function advancePreparation(dt, time) {
  if (state.phase !== "making") return;
  state.elapsed = Math.min(DURATION, state.elapsed + dt);
  if (state.elapsed >= DURATION) {
    state.phase = "ready";
    state.readyAt = time;
    setInteractionLock();
    $("#status").textContent =
      `Your ${state.temperature === "hot" ? "hot" : "iced"} ${getRecipe(state.coffee, state.temperature).name} is ready. Enjoy.`;
    $("#state-label").textContent = "MADE WITH A LITTLE LOVE";
  } else
    $("#status").textContent = recipeAt(
      state.elapsed,
      state.coffee,
      state.temperature,
    ).message;
  const percent = Math.round((state.elapsed / DURATION) * 100);
  $("#progress-fill").style.width = `${percent}%`;
  $(".progress").setAttribute("aria-valuenow", String(percent));
}
function initOrders() {
  const form = $("#order-form"),
    timeInput = $("#pickup-time"),
    nameInput = $("#customer-name");
  $("#timezone-label").textContent =
    `Your local time · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  const updateMin = () => {
    const d = new Date(Date.now() + 60000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    timeInput.min = d.toISOString().slice(0, 16);
  };
  updateMin();
  timeInput.addEventListener("focus", updateMin);
  for (const input of [nameInput, timeInput])
    input.addEventListener("input", () => {
      input.setCustomValidity("");
      clearNotification();
    });
  let activeOrder = null,
    lastAttempt = 0;
  const submitNotification = async () => {
    state.emailStatus = "sending";
    $("#notification-status").textContent = "Sending your coffee request…";
    $("#retry-notification").hidden = true;
    setInteractionLock();
    lastAttempt = Date.now();
    try {
      const result = await sendNotification(activeOrder);
      state.emailStatus = result.status;
      $("#notification-status").textContent =
        result.status === "activation"
          ? "Your host needs to activate notifications. Please ask them to check their inbox."
          : "Request submitted. Your coffee host will confirm.";
    } catch {
      state.emailStatus = "failed";
      $("#notification-status").textContent =
        "We couldn't confirm your request. You can retry sending below.";
      $("#retry-notification").hidden = false;
    } finally {
      setInteractionLock();
    }
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (
      state.phase === "making" ||
      state.emailStatus === "sending" ||
      $("#website").value
    )
      return;
    try {
      activeOrder = buildOrder({
        name: nameInput.value,
        ...state,
        pickupValue: timeInput.value,
      });
    } catch (error) {
      const input = nameInput.value.trim() ? timeInput : nameInput;
      input.setCustomValidity(error.message);
      input.reportValidity();
      return;
    }
    state.phase = "making";
    state.elapsed = 0;
    beginScene();
    $("#status").textContent = recipeAt(
      0,
      state.coffee,
      state.temperature,
    ).message;
    $("#progress-fill").style.width = "0%";
    $(".progress").setAttribute("aria-valuenow", "0");
    void submitNotification();
  });
  $("#retry-notification").addEventListener("click", () => {
    if (
      !activeOrder ||
      state.phase === "making" ||
      state.emailStatus !== "failed"
    )
      return;
    if (Date.now() - lastAttempt < 10000) {
      $("#notification-status").textContent =
        "Please wait a moment before retrying.";
      return;
    }
    if (
      activeOrder.pickup_mode === "custom" &&
      new Date(activeOrder.pickup_iso) <= new Date()
    ) {
      $("#notification-status").textContent =
        "Please choose a future pickup time and make a new request.";
      return;
    }
    void submitNotification();
  });
}
