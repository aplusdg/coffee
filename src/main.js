import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { FLOOR, DURATION, liquidRadius, recipeAt, smooth } from "./recipe.js";
import { createArtTexture } from "./brand.js";
import { buildOrder, DEFAULT_RECIPIENTS } from "./order.js";
import { sendNotification } from "./notifications.js";
import "./style.css";

const $ = (selector) => document.querySelector(selector);
const state = {
  batch: 0,
  temperature: "hot",
  strength: "regular",
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

  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.105, 20, 60, Math.PI * 1.65),
    ceramic,
  );
  handle.position.set(1.04, 0.05, 0);
  handle.rotation.z = -Math.PI * 0.825;
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
    color: 0xf4fbff,
    transmission: 0.8,
    roughness: 0.16,
    thickness: 0.35,
    ior: 1.31,
  });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.23, 0.24), iceMat);
    const a = (i * Math.PI * 2) / 5;
    m.userData = { a, phase: i };
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(m.geometry),
      new THREE.LineBasicMaterial({
        color: 0x99b5ae,
        transparent: true,
        opacity: 0.35,
      }),
    );
    m.add(edges);

    m.rotation.set(0.1 + i * 0.07, i, 0.1);
    iceGroup.add(m);
  }
  // Pouring begins just inside the rim; no oversized pipe above the cup.
  const stream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 1, 12),
    coffeeMat.clone(),
  );
  stream.visible = false;
  cup.add(stream);
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
        milk,
        foam: foamP,
        level,
        radius,
        foamHeight,
        foamRadius,
      } = recipeAt(t, state.strength);
    const active = state.phase !== "idle";
    liquid.visible = active;
    if (level !== lastLevel) {
      updateLiquid(level);
      lastLevel = level;
    }
    const dark = new THREE.Color(
        state.strength === "strong" ? 0x351a0c : 0x50270f,
      ),
      latte = new THREE.Color(
        state.strength === "strong" ? 0xa46d3f : 0xc69a65,
      );
    coffeeMat.color.copy(dark).lerp(latte, milk * 0.94);
    const motion = reduced ? 0 : Math.sin(time * 3) * (0.004 + hover) + impulse;
    top.rotation.x = -Math.PI / 2 + motion * 0.4;
    foamSurface.visible = foamP > 0;
    foamSurface.position.y = level;
    foamSurface.rotation.x = motion * 0.4;
    foam.scale.set(foamRadius, Math.max(0.001, foamP), foamRadius);
    foam.position.y = foamHeight / 2;
    foamTop.position.y = foamHeight + 0.003;
    foamTop.scale.setScalar(foamRadius);
    foamTop.visible = foamP > 0.55;
    art.scale.setScalar(smooth(foamP, 0.55, 1));
    stream.visible =
      state.phase === "making" &&
      (t < 3.5 || (t > 3.8 && t < 7.5) || (t > 7.8 && t < 10.5));
    const streamBottom = level + foamHeight;
    stream.scale.y = Math.max(0.001, 0.87 - streamBottom);
    stream.position.set(0.12, (0.87 + streamBottom) / 2, -0.08);
    stream.material.color.set(
      t < 3.8 ? 0x512b15 : t < 7.8 ? 0xf4e5cd : 0xffefd4,
    );
    iceGroup.visible = state.temperature === "iced" && active;
    for (const m of iceGroup.children) {
      const { a, phase } = m.userData;
      const orbit = Math.min(0.6, radius - 0.23);
      m.position.set(
        Math.cos(a) * orbit + Math.sin(time + phase) * hover,
        Math.max(FLOOR + 0.19, level + 0.08 * foamP) +
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
        0.68 + age * 0.95,
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
function reset() {
  state.phase = "idle";
  state.elapsed = 0;
  $("#make").innerHTML =
    "Make my coffee <span aria-hidden='true' class='arrow-icon'></span>";
  $("#status").textContent = "Good things take a little time.";
  $("#progress-fill").style.width = "0%";
  $(".progress").setAttribute("aria-valuenow", "0");
  $("#cup-label").textContent =
    state.temperature === "hot" ? "THE WARM CLASSIC" : "A COOL LITTLE ESCAPE";
  $("#recipe-ratio").textContent =
    state.strength === "regular" ? "1 : 1 : 1" : "2 : 1 : 1";
  $("#order-submit").disabled = true;
  $("#order-hint").textContent =
    "Make your coffee above, then send your request.";
  $("#order-status").textContent = "";
  resetScene();
}
function initControls() {
  for (const id of ["temperature", "strength", "art", "timing"])
    $(`#${id}`).addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button || button.disabled) return;
      state[id] = button.dataset.value;
      for (const b of $(`#${id}`).querySelectorAll("button")) {
        b.classList.toggle("selected", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      }
      if (id === "timing") {
        $("#custom-time-field").hidden = state.timing !== "custom";
        $("#pickup-time").required = state.timing === "custom";
        return;
      }
      if (id === "art" && state.phase === "ready") {
        resetScene();
        return;
      }
      reset();
    });
  $("#make").addEventListener("click", () => {
    state.batch++;
    state.phase = "making";
    state.elapsed = 0;
    $("#make").disabled = true;
    $("#make").innerHTML =
      "Making your moment <span aria-hidden='true' class='spinner-icon'></span>";
    $("#order-submit").disabled = true;
    document
      .querySelectorAll(".panel .choices button")
      .forEach((b) => (b.disabled = true));
    beginScene();
  });
  // Keep the order flow usable when WebGL is unavailable.
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
    $("#make").disabled = false;
    $("#make").innerHTML =
      "Make another <span aria-hidden='true' class='replay-icon'></span>";
    document
      .querySelectorAll(".panel .choices button")
      .forEach((b) => (b.disabled = false));
    $("#status").textContent =
      state.temperature === "hot"
        ? "Your hot cappuccino is ready. Enjoy slowly."
        : "Your iced cappuccino is ready. Stay cool.";
    $("#state-label").textContent = "MADE WITH A LITTLE LOVE";
    $("#order-submit").disabled = false;
    $("#order-hint").textContent =
      "Your cup is ready. Add your name and preferred time.";
  } else
    $("#status").textContent = [
      "Pulling a rich espresso…",
      "Folding in silky milk…",
      "A soft finish, made just for you…",
    ][Math.min(2, Math.floor(state.elapsed / 4))];
  const percent = Math.round((state.elapsed / DURATION) * 100);
  $("#progress-fill").style.width = `${percent}%`;
  $(".progress").setAttribute("aria-valuenow", String(percent));
}
function initOrders() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  $("#timezone-label").textContent = `Your local time · ${zone}`;
  const timeInput = $("#pickup-time");
  const updateMin = () => {
    const d = new Date(Date.now() + 60000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    timeInput.min = d.toISOString().slice(0, 16);
  };
  updateMin();
  timeInput.addEventListener("focus", updateMin);
  const dialog = $("#order-dialog");
  $(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
  let order,
    fingerprint = "",
    submitted = false,
    pending = false;
  let lastAttempt = 0;
  $("#order-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.phase !== "ready") return;
    if (pending) return;
    const nextFingerprint = JSON.stringify([
      state.batch,
      $("#customer-name").value.trim(),
      state.temperature,
      state.strength,
      state.art,
      state.timing,
      timeInput.value,
    ]);
    try {
      const candidate = buildOrder({
        name: $("#customer-name").value,
        ...state,
        pickupValue: timeInput.value,
      });
      if (fingerprint !== nextFingerprint) {
        order = candidate;
        fingerprint = nextFingerprint;
        submitted = false;
      }
    } catch (error) {
      $("#order-status").textContent = error.message;
      return;
    }
    $("#order-status").textContent = "";
    $("#order-summary").replaceChildren();
    const rows = [
      ["Name", order.customer_name],
      ["Coffee", `${order.temperature} ${order.strength} cappuccino`],
      ["Latte art", order.latte_art],
      ["Requested time", order.pickup_time],
      ["Notify", DEFAULT_RECIPIENTS.join(", ")],
    ];
    for (const [label, value] of rows) {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      $("#order-summary").append(dt, dd);
    }
    $("#send-order").disabled = submitted;
    $("#delivery-note").textContent =
      "Your name and coffee details will be emailed to the host via FormSubmit. Your coffee is confirmed when the host replies.";
    $("#delivery-status").textContent = submitted
      ? "This request has already been submitted. Please wait for the coffee host to confirm."
      : "";
    dialog.showModal();
  });
  $("#send-order").addEventListener("click", async () => {
    if (!order || pending || submitted) return;
    if (
      order.pickup_mode === "custom" &&
      new Date(order.pickup_iso) <= new Date()
    ) {
      $("#delivery-status").textContent =
        "This pickup time has passed. Close this preview and choose a future time.";
      return;
    }
    if ($("#website").value) return;
    if (Date.now() - lastAttempt < 10000) {
      $("#delivery-status").textContent =
        "Please wait a few seconds before trying again.";
      return;
    }
    pending = true;
    lastAttempt = Date.now();
    $("#send-order").disabled = true;
    $("#delivery-status").textContent = "Sending your coffee request…";
    try {
      const result = await sendNotification(order);
      submitted = true;
      const message =
        result.status === "activation"
          ? "The coffee host needs to activate email notifications. Please ask them to check their inbox before sending a new request."
          : "Request submitted. Please wait for the coffee host to confirm.";
      $("#delivery-status").textContent = message;
      $("#order-status").textContent = message;
    } catch {
      $("#delivery-status").textContent =
        "Your request could not be confirmed. Please try again in a moment.";
      $("#send-order").disabled = false;
    } finally {
      pending = false;
    }
  });
}
