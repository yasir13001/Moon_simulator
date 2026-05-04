import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const API_BASE = "http://127.0.0.1:8000";
const SKY_RADIUS = 90;

const statusEl = document.getElementById("status");
const metadataContentEl = document.getElementById("metadataContent");
const latEl = document.getElementById("lat");
const lonEl = document.getElementById("lon");
const speedEl = document.getElementById("speed");
const playPauseEl = document.getElementById("playPause");
const jumpNowEl = document.getElementById("jumpNow");
const timeInputEl = document.getElementById("timeInput");
const timelineEl = document.getElementById("timeline");
const timelineLabelEl = document.getElementById("timelineLabel");
const followSelectedEl = document.getElementById("followSelected");
const applyBtn = document.getElementById("apply");
const objectSearchEl = document.getElementById("objectSearch");
const searchBtnEl = document.getElementById("searchBtn");
const espTrackEl = document.getElementById("espTrack");
const espAzEl = document.getElementById("espAz");
const espAltEl = document.getElementById("espAlt");
const espSendBtnEl = document.getElementById("espSendBtn");
const espStatusEl = document.getElementById("espStatus");
const espBaselineBtnEl = document.getElementById("espBaselineBtn");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000006);


const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  2000,
);
camera.position.set(0, 5, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pickableObjects = [];
let latestSkyData = null;
let hoveredObject = null;
let selectedObject = null;
let isFlying = false;
let latestMoonAzDeg = null;
let latestMoonAltDeg = null;
let espLastSentMs = 0;
let lastMoonSentAzDeg = null;
let lastMoonSentAltDeg = null;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 200;

const ambient = new THREE.AmbientLight(0x111122, 0.4);
scene.add(ambient);
const hemiLight = new THREE.HemisphereLight(0x0033aa, 0x002200, 0.3);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xfff2c1, 2.0);
sunLight.castShadow = false;
scene.add(sunLight);

const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({
  color: 0x03030a,
  side: THREE.BackSide,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

addCardinalMarker("N", 0);
addCardinalMarker("E", 90);
addCardinalMarker("S", 180);
addCardinalMarker("W", 270);

// Load real Earth texture from CDN
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load(
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg"
);
const earthSpecTexture = textureLoader.load(
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_specular_2048.jpg"
);
const earthNormalTexture = textureLoader.load(
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_normal_2048.jpg"
);
const earthCloudsTexture = textureLoader.load(
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_clouds_1024.png"
);
const moonTexture = textureLoader.load(
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/moon_1024.jpg"
);

// Earth radius large enough that only the curved top is visible —
// observer feels like they're standing on the surface, not floating above a ball.
const EARTH_RADIUS = 400;

const earthRef = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS, 128, 128),
  new THREE.MeshPhongMaterial({
    map: earthTexture,
    specularMap: earthSpecTexture,
    normalMap: earthNormalTexture,
    specular: new THREE.Color(0x4488aa),
    shininess: 25,
  }),
);
earthRef.position.set(0, -EARTH_RADIUS - 7, 0);
scene.add(earthRef);
earthRef.userData.name = "Earth";

// Cloud layer
const earthCloudBand = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.004, 128, 128),
  new THREE.MeshPhongMaterial({
    map: earthCloudsTexture,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  }),
);
earthCloudBand.position.copy(earthRef.position);
scene.add(earthCloudBand);

// Atmosphere glow
const earthAtmo = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.02, 128, 128),
  new THREE.MeshPhongMaterial({
    color: 0x2255aa,
    transparent: true,
    opacity: 0.10,
    side: THREE.BackSide,
    depthWrite: false,
  }),
);
earthAtmo.position.copy(earthRef.position);
scene.add(earthAtmo);

const stars = new THREE.Group();
for (let i = 0; i < 500; i++) {
  const p = randomPointOnSphere(SKY_RADIUS - 2);
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 }),
  );
  star.position.copy(p);
  star.userData.name = `Star ${i + 1}`;
  stars.add(star);
  pickableObjects.push(star);
}
scene.add(stars);

const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 64, 64),
  new THREE.MeshBasicMaterial({
    map: moonTexture,
  }),
);
scene.add(moonMesh);
moonMesh.userData.name = "Moon";
pickableObjects.push(moonMesh);

// Sun core
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.7, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffe87a }),
);
scene.add(sunMesh);
sunMesh.userData.name = "Sun";
pickableObjects.push(sunMesh);
pickableObjects.push(earthRef);

// Sun glow — two additive sprite layers for corona effect
function makeSunGlowTexture(innerAlpha, outerSize) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0,   `rgba(255,245,180,${innerAlpha})`);
  g.addColorStop(0.2, `rgba(255,200,80,${innerAlpha * 0.6})`);
  g.addColorStop(0.6, `rgba(255,140,20,0.15)`);
  g.addColorStop(1,   "rgba(255,100,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const sunGlow1 = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeSunGlowTexture(0.9, 64),
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
}));
sunGlow1.scale.set(8, 8, 1);
scene.add(sunGlow1);

const sunGlow2 = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeSunGlowTexture(0.35, 128),
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
}));
sunGlow2.scale.set(20, 20, 1);
scene.add(sunGlow2);

let location = {
  lat: Number.parseFloat(latEl.value),
  lon: Number.parseFloat(lonEl.value),
};
let simTimeMs = Date.now();
let simSpeed = Number.parseFloat(speedEl.value);
let isPlaying = true;
let isScrubbingTimeline = false;
let lastFrameMs = performance.now();
let lastFetchRealMs = 0;
let lastFetchSimTimeMs = null;
let isFetchingSky = false;
let forceSkyFetchQueued = false;

// Interpolation between snapshots: we keep two time-stamped positions and blend.
let moonSnap0Vec = null;
let moonSnap1Vec = null;
let sunSnap0Vec = null;
let sunSnap1Vec = null;
let moonSnap0Light = 0;
let moonSnap1Light = 0;
let moonSnap0TimeMs = 0;
let moonSnap1TimeMs = 0;
let sunSnap0AltDeg = 0;
let sunSnap1AltDeg = 0;

const FETCH_EVERY_SIM_MS = 2000; // throttle by simulated time
const FETCH_MAX_REAL_MS = 2500; // safety cap for status freshness

applyBtn.addEventListener("click", () => {
  const lat = Number.parseFloat(latEl.value);
  const lon = Number.parseFloat(lonEl.value);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    setStatus("Invalid latitude/longitude.");
    return;
  }
  location = { lat, lon };
  setStatus(`Location set to ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  fetchSky(true);
});

speedEl.addEventListener("change", () => {
  simSpeed = Number.parseFloat(speedEl.value);
});

espSendBtnEl.addEventListener("click", () => {
  if (latestMoonAzDeg === null || latestMoonAltDeg === null) return;
  sendRelativeToESP(latestMoonAzDeg, latestMoonAltDeg, true);
});

espBaselineBtnEl.addEventListener("click", () => {
  if (latestMoonAzDeg === null || latestMoonAltDeg === null) return;
  lastMoonSentAzDeg = latestMoonAzDeg;
  lastMoonSentAltDeg = latestMoonAltDeg;
  espStatusEl.textContent = `ESP baseline set (next update will move).`;
});
playPauseEl.addEventListener("click", () => {
  isPlaying = !isPlaying;
  playPauseEl.textContent = isPlaying ? "Pause" : "Play";
  if (!isPlaying) {
    setStatus("Simulation paused.");
  }
});
jumpNowEl.addEventListener("click", () => {
  simTimeMs = Date.now();
  updateTimeControls();
  fetchSky(true);
});
timeInputEl.addEventListener("change", () => {
  const selected = new Date(timeInputEl.value);
  if (Number.isNaN(selected.getTime())) {
    return;
  }
  simTimeMs = selected.getTime();
  isPlaying = false;
  playPauseEl.textContent = "Play";
  updateTimeControls();
  fetchSky(true);
});
timelineEl.addEventListener("pointerdown", () => {
  isScrubbingTimeline = true;
});
timelineEl.addEventListener("pointerup", () => {
  isScrubbingTimeline = false;
});
timelineEl.addEventListener("input", () => {
  const offsetMinutes = Number.parseInt(timelineEl.value, 10);
  simTimeMs = Date.now() + offsetMinutes * 60 * 1000;
  isPlaying = false;
  playPauseEl.textContent = "Play";
  updateTimeControls();
  fetchSky(true);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
renderer.domElement.addEventListener("click", onCanvasClick);
renderer.domElement.addEventListener("mousemove", onCanvasHover);

searchBtnEl.addEventListener("click", () => {
  const query = (objectSearchEl.value ?? "").trim();
  if (!query) return;
  onSearch(query);
});
objectSearchEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const query = (objectSearchEl.value ?? "").trim();
    if (!query) return;
    onSearch(query);
  }
});

setStatus("Initializing viewer...");
updateTimeControls();
fetchSky(true);
animate();

function animate(now = performance.now()) {
  const deltaSeconds = (now - lastFrameMs) / 1000;
  lastFrameMs = now;
  if (isPlaying) {
    simTimeMs += deltaSeconds * simSpeed * 1000;
  }
  updateTimeControls();

  // Fetch smarter: only when simulated time advanced enough.
  if (!isFetchingSky && isPlaying) {
    const simDelta = lastFetchSimTimeMs === null ? Infinity : simTimeMs - lastFetchSimTimeMs;
    const realDelta = now - lastFetchRealMs;
    if (simDelta >= FETCH_EVERY_SIM_MS || realDelta >= FETCH_MAX_REAL_MS) {
      fetchSky(false);
    }
  }

  // Apply interpolated positions FIRST so selectedObject.position is current this frame.
  applyInterpolatedSky();

  // Follow mode: disable OrbitControls damping while following so its internal
  // lerp doesn't fight our target update every frame (that's what causes jitter).
  // Hard-copy the target directly — the object moves slowly enough that it's smooth.
  if (followSelectedEl.value === "on" && selectedObject && !isFlying) {
    controls.enableDamping = false;
    controls.target.copy(selectedObject.position);
  } else {
    controls.enableDamping = true;
  }
  controls.update();

  // Auto track: send Moon az/alt to the ESP periodically.
  const trackEverySeconds = Number.parseInt(espTrackEl.value, 10);
  const shouldTrack = Number.isFinite(trackEverySeconds) && trackEverySeconds > 0;
  if (
    shouldTrack &&
    latestMoonAzDeg !== null &&
    latestMoonAltDeg !== null &&
    now - espLastSentMs > trackEverySeconds * 1000
  ) {
    espLastSentMs = now;
    // If baseline not set, set it and wait for next tick (prevents big initial jump).
    if (lastMoonSentAzDeg === null || lastMoonSentAltDeg === null) {
      lastMoonSentAzDeg = latestMoonAzDeg;
      lastMoonSentAltDeg = latestMoonAltDeg;
      espStatusEl.textContent = `ESP baseline set (next update will move).`;
    } else {
      sendRelativeToESP(latestMoonAzDeg, latestMoonAltDeg, false);
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

async function fetchSky(force) {
  if (isFetchingSky) {
    if (force) {
      forceSkyFetchQueued = true;
    }
    return;
  }
  isFetchingSky = true;

  const requestSimTimeMs = simTimeMs;

  try {
    const timeIso = new Date(requestSimTimeMs).toISOString();
    const url = new URL(`${API_BASE}/api/sky`);
    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lon", String(location.lon));
    url.searchParams.set("time", timeIso);

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }
    const sky = await response.json();
    latestSkyData = sky;
    applySkySnapshot(sky, requestSimTimeMs, force);
    lastFetchRealMs = performance.now();
    lastFetchSimTimeMs = requestSimTimeMs;

    const moon = sky.celestial_objects.find((o) => o.type === "moon")?.data;
    const sun = sky.celestial_objects.find((o) => o.type === "sun")?.data;
    const moonAlt = moon?.position?.horizontal?.altitude_deg ?? 0;
    const moonAz = moon?.position?.horizontal?.azimuth_deg ?? 0;
    const illum = moon?.phase?.illumination_fraction ?? 0;
    const sunAlt = sun?.position?.horizontal?.altitude_deg ?? 0;

    latestMoonAltDeg = moonAlt;
    latestMoonAzDeg = moonAz;
    espAzEl.value = String(moonAz.toFixed(2));
    espAltEl.value = String(moonAlt.toFixed(2));
    setStatus(
      `${new Date(simTimeMs).toLocaleString()} | Moon alt ${moonAlt.toFixed(1)}° | Illum ${(illum * 100).toFixed(1)}% | Sun alt ${sunAlt.toFixed(1)}°`,
    );
  } catch (error) {
    if (force) {
      setStatus(`Unable to fetch /api/sky: ${error.message}`);
    }
  } finally {
    isFetchingSky = false;
    if (forceSkyFetchQueued) {
      forceSkyFetchQueued = false;
      fetchSky(true);
    }
  }
}

function normalizeAzDeltaDeg(daz) {
  // Map to [-180, 180] to avoid wrap jumps around 0/360.
  let d = daz;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

async function sendRelativeToESP(azDeg, altDeg, showBaselineHint) {
  try {
    if (lastMoonSentAzDeg === null || lastMoonSentAltDeg === null) {
      // Baseline should be set via the "baseline" button or auto-track first tick.
      if (showBaselineHint) {
        espStatusEl.textContent = `Set tracking baseline first (then send).`;
      }
      return;
    }

    const daz = normalizeAzDeltaDeg(azDeg - lastMoonSentAzDeg);
    const dalt = altDeg - lastMoonSentAltDeg;

    // Clamp deltas for safety (relative move).
    const dazClamped = Math.max(-180.0, Math.min(180.0, daz));
    const daltClamped = Math.max(-90.0, Math.min(90.0, dalt));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const url = new URL(`${API_BASE}/api/esp/move`);
    url.searchParams.set("az", String(dazClamped));
    url.searchParams.set("alt", String(daltClamped));
    url.searchParams.set("relative", "true");
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    if (data.ok) {
      espStatusEl.textContent = `ESP: ${data.response} (daz=${data.sent.az.toFixed(
        1,
      )} dalt=${data.sent.alt.toFixed(1)})`;
      // Advance baseline for the next delta move.
      lastMoonSentAzDeg = azDeg;
      lastMoonSentAltDeg = altDeg;
    } else {
      espStatusEl.textContent = `ESP error: ${data.error ?? "Unknown error"}`;
    }
  } catch (e) {
    espStatusEl.textContent = `ESP request failed: ${e.message ?? String(e)}`;
  }
}

function onSearch(query) {
  const q = query.toLowerCase();

  // Prefer real objects first.
  const directMap = {
    moon: moonMesh,
    sun: sunMesh,
    earth: earthRef,
  };
  if (directMap[q]) {
    selectAndFly(directMap[q]);
    return;
  }

  // Otherwise do a best-effort name match across pickable objects.
  const obj = pickableObjects.find((o) => {
    const name = (o.userData?.name ?? "").toLowerCase();
    return name && name.includes(q);
  });
  if (!obj) {
    setStatus(`No object found for "${query}".`);
    return;
  }
  selectAndFly(obj);
}

function selectAndFly(obj) {
  selectedObject = obj;
  followSelectedEl.value = "on";

  if (obj === moonMesh) {
    const moon = latestSkyData?.celestial_objects?.find((o) => o.type === "moon")?.data ?? {};
    renderMetadata("Moon", moon);
  } else if (obj === sunMesh) {
    const sun = latestSkyData?.celestial_objects?.find((o) => o.type === "sun")?.data ?? {};
    renderMetadata("Sun", sun);
  } else if (obj === earthRef) {
    renderMetadata("Earth Reference", {
      description: "Viewer reference object for horizon and orientation.",
      location,
      simulated_time: new Date(simTimeMs).toISOString(),
    });
  } else {
    renderMetadata(obj.userData?.name ?? "Object", {
      type: "synthetic",
      position: {
        x: Number(obj.position.x.toFixed(3)),
        y: Number(obj.position.y.toFixed(3)),
        z: Number(obj.position.z.toFixed(3)),
      },
    });
  }

  flyTargetTo(obj.position.clone(), obj === earthRef ? 15 : 25);
}

function flyTargetTo(targetPos, desiredDistance) {
  // Interrupt any in-progress fly so new requests are never silently dropped.
  isFlying = false;
  requestAnimationFrame(() => _startFly(targetPos, desiredDistance));
}

function _startFly(targetPos, desiredDistance) {
  isFlying = true;

  const startTarget = controls.target.clone();
  const endTarget = targetPos.clone();

  const startCameraPos = camera.position.clone();
  const toStart = startCameraPos.clone().sub(startTarget);
  const dir = toStart.lengthSq() > 1e-6 ? toStart.normalize() : new THREE.Vector3(0, 0, 1);

  const endCameraPos = endTarget.clone().add(dir.multiplyScalar(desiredDistance));

  const startMs = performance.now();
  const durationMs = 900;

  function step() {
    const t = Math.min(1, (performance.now() - startMs) / durationMs);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad

    controls.target.lerpVectors(startTarget, endTarget, eased);
    camera.position.lerpVectors(startCameraPos, endCameraPos, eased);
    camera.lookAt(controls.target);
    controls.update();

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      isFlying = false;
    }
  }

  requestAnimationFrame(step);
}

function applySkySnapshot(sky, requestSimTimeMs, force = false) {
  const moon = sky.celestial_objects.find((o) => o.type === "moon")?.data;
  const sun = sky.celestial_objects.find((o) => o.type === "sun")?.data;
  if (!moon || !sun) return;

  const moonAlt = moon.position.horizontal.altitude_deg;
  const moonAz = moon.position.horizontal.azimuth_deg;
  const sunAlt = sun.position.horizontal.altitude_deg;
  const sunAz = sun.position.horizontal.azimuth_deg;

  const moonLight = moon.phase.illumination_fraction;
  const moonVec = horizontalToCartesian(moonAlt, moonAz, SKY_RADIUS - 8);
  const sunVec = horizontalToCartesian(sunAlt, sunAz, SKY_RADIUS - 12);

  // Initialize on first snapshot, or collapse window on forced fetch (scrub/jump)
  // so we don't lerp across a stale time range.
  if (moonSnap1Vec === null || force) {
    moonSnap0Vec = moonVec.clone();
    moonSnap1Vec = moonVec.clone();
    sunSnap0Vec = sunVec.clone();
    sunSnap1Vec = sunVec.clone();
    moonSnap0Light = moonLight;
    moonSnap1Light = moonLight;
    moonSnap0TimeMs = requestSimTimeMs;
    moonSnap1TimeMs = requestSimTimeMs;
    sunSnap0AltDeg = sunAlt;
    sunSnap1AltDeg = sunAlt;
    applyInterpolatedSky();
    return;
  }

  // Shift current "next" snapshot to "prev" and set the new "next".
  moonSnap0Vec = moonSnap1Vec;
  moonSnap0Light = moonSnap1Light;
  moonSnap0TimeMs = moonSnap1TimeMs;
  sunSnap0Vec = sunSnap1Vec;
  sunSnap0AltDeg = sunSnap1AltDeg;

  moonSnap1Vec = moonVec;
  moonSnap1Light = moonLight;
  moonSnap1TimeMs = requestSimTimeMs;
  sunSnap1Vec = sunVec;
  sunSnap1AltDeg = sunAlt;
}

function applyInterpolatedSky() {
  if (!moonSnap0Vec || !moonSnap1Vec || !sunSnap0Vec || !sunSnap1Vec) return;
  const denom = moonSnap1TimeMs - moonSnap0TimeMs;
  const alpha = denom === 0 ? 1 : (simTimeMs - moonSnap0TimeMs) / denom;
  const t = Math.max(0, Math.min(1, alpha));

  moonMesh.position.copy(moonSnap0Vec).lerp(moonSnap1Vec, t);
  sunMesh.position.copy(sunSnap0Vec).lerp(sunSnap1Vec, t);

  // Keep sun glow sprites locked to sun position
  sunGlow1.position.copy(sunMesh.position);
  sunGlow2.position.copy(sunMesh.position);

  // Sun light direction
  sunLight.position.copy(sunMesh.position).normalize();

  // Moon: point it toward the sun so the texture lit side matches reality
  moonMesh.lookAt(sunMesh.position);

  // Sun intensity by altitude
  const sunAltDeg = sunSnap0AltDeg + (sunSnap1AltDeg - sunSnap0AltDeg) * t;
  const sunAboveHorizon = Math.max(0, sunAltDeg);
  sunLight.intensity = 0.15 + Math.min(2.2, sunAboveHorizon / 10);

  // Sun glow visibility — hide below horizon
  const sunVisible = sunAltDeg > -3;
  sunGlow1.visible = sunVisible;
  sunGlow2.visible = sunVisible;
  if (sunVisible) {
    const glowFade = Math.min(1, (sunAltDeg + 3) / 8);
    sunGlow1.material.opacity = glowFade;
    sunGlow2.material.opacity = glowFade * 0.5;
  }

  // Stars: fade out when sun is above horizon
  const starOpacity = sunAltDeg < -6
    ? 1.0
    : sunAltDeg > 6
      ? 0.0
      : Math.max(0, 1.0 - (sunAltDeg + 6) / 12);
  stars.children.forEach((star) => {
    star.material.opacity = starOpacity;
  });
  stars.visible = starOpacity > 0.01;

  // Ambient dims at night, brightens at day
  ambient.intensity = 0.08 + Math.min(0.5, sunAboveHorizon / 30);
  hemiLight.intensity = 0.05 + Math.min(0.4, sunAboveHorizon / 40);

  // Sky colour gradient keyed to sun altitude:
  const skyStops = [
    { alt: -18, color: new THREE.Color(0x000006) },
    { alt:  -6, color: new THREE.Color(0x0a0520) },
    { alt:   0, color: new THREE.Color(0x8c2e0a) },
    { alt:   4, color: new THREE.Color(0xd4601a) },
    { alt:   8, color: new THREE.Color(0xe89040) },
    { alt:  15, color: new THREE.Color(0x60a8e8) },
    { alt:  30, color: new THREE.Color(0x2872cc) },
    { alt:  90, color: new THREE.Color(0x1255a8) },
  ];
  let skyColor = skyStops[0].color.clone();
  for (let i = 0; i < skyStops.length - 1; i++) {
    const lo = skyStops[i];
    const hi = skyStops[i + 1];
    if (sunAltDeg >= lo.alt && sunAltDeg <= hi.alt) {
      const f = (sunAltDeg - lo.alt) / (hi.alt - lo.alt);
      skyColor = lo.color.clone().lerp(hi.color, f);
      break;
    }
    if (sunAltDeg > hi.alt) skyColor = hi.color.clone();
  }
  scene.background = skyColor;
  skyMat.color.copy(skyColor);

  // Tint sun mesh colour warmer near horizon
  if (sunAltDeg < 10) {
    const horizonTint = Math.max(0, 1 - sunAltDeg / 10);
    sunMesh.material.color.setRGB(1, 0.85 - horizonTint * 0.25, 0.3 - horizonTint * 0.25);
  } else {
    sunMesh.material.color.setRGB(1, 0.91, 0.48);
  }
}

function horizontalToCartesian(altDeg, azDeg, radius) {
  const alt = THREE.MathUtils.degToRad(altDeg);
  const az = THREE.MathUtils.degToRad(azDeg);
  const x = radius * Math.cos(alt) * Math.sin(az);
  const y = radius * Math.sin(alt);
  const z = -radius * Math.cos(alt) * Math.cos(az); // <-- flipped
  return new THREE.Vector3(x, y, z);
}

function randomPointOnSphere(radius) {
  const u = Math.random() * 2 - 1;
  const phi = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return new THREE.Vector3(
    radius * r * Math.cos(phi),
    radius * u,
    radius * r * Math.sin(phi),
  );
}

function setStatus(message) {
  statusEl.textContent = message;
}

function updateTimeControls() {
  if (!isScrubbingTimeline) {
    const offsetMinutes = Math.round((simTimeMs - Date.now()) / (60 * 1000));
    const clamped = Math.max(-1440, Math.min(1440, offsetMinutes));
    timelineEl.value = String(clamped);
    timelineLabelEl.textContent =
      clamped === 0
        ? "Now"
        : `${clamped > 0 ? "+" : ""}${clamped} min from now`;
  }
  timeInputEl.value = toDatetimeLocal(simTimeMs);
}

function toDatetimeLocal(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function onCanvasClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(pickableObjects, false);
  if (hits.length === 0) return;

  const hit = hits[0].object;
  selectedObject = hit;
  if (hit === moonMesh) {
    renderMetadata("Moon", latestSkyData?.celestial_objects?.find((o) => o.type === "moon")?.data ?? {});
    return;
  }
  if (hit === sunMesh) {
    renderMetadata("Sun", latestSkyData?.celestial_objects?.find((o) => o.type === "sun")?.data ?? {});
    return;
  }
  if (hit === earthRef) {
    renderMetadata("Earth Reference", {
      description: "Viewer reference object for horizon and orientation.",
      location,
      simulated_time: new Date(simTimeMs).toISOString(),
    });
    return;
  }

  // Stars use local synthetic data in this MVP.
  renderMetadata("Star", {
    type: "synthetic",
    position: {
      x: Number(hit.position.x.toFixed(3)),
      y: Number(hit.position.y.toFixed(3)),
      z: Number(hit.position.z.toFixed(3)),
    },
    note: "Generated local star for orientation (catalog integration pending).",
  });
}

function renderMetadata(title, data) {
  metadataContentEl.innerHTML = "";

  const subtitle = document.createElement("div");
  subtitle.className = "meta-subtitle";
  subtitle.textContent = `${title} • ${new Date(simTimeMs).toLocaleString()}`;
  metadataContentEl.appendChild(subtitle);

  if (!data || Object.keys(data).length === 0) {
    const empty = document.createElement("div");
    empty.className = "meta-section";
    empty.textContent = "No metadata available.";
    metadataContentEl.appendChild(empty);
    return;
  }

  const simple = flattenData(data);
  const groups = {
    Position: filterByPrefix(simple, ["position.", "horizontal.", "equatorial.", "geocentric."]),
    Visibility: filterByPrefix(simple, ["visibility."]),
    Phase: filterByPrefix(simple, ["phase.", "libration.", "appearance."]),
    Other: simple,
  };

  Object.entries(groups).forEach(([sectionTitle, entries]) => {
    const rows = Object.entries(entries);
    if (rows.length === 0) return;
    const sectionEl = document.createElement("div");
    sectionEl.className = "meta-section";

    const titleEl = document.createElement("div");
    titleEl.className = "meta-section-title";
    titleEl.textContent = sectionTitle;
    sectionEl.appendChild(titleEl);

    rows.slice(0, 8).forEach(([key, value]) => {
      const row = document.createElement("div");
      row.className = "meta-row";

      const keyEl = document.createElement("div");
      keyEl.className = "meta-key";
      keyEl.textContent = prettifyKey(key);

      const valueEl = document.createElement("div");
      valueEl.className = "meta-value";
      valueEl.textContent = formatValue(value);

      row.appendChild(keyEl);
      row.appendChild(valueEl);
      sectionEl.appendChild(row);
      delete simple[key];
    });

    metadataContentEl.appendChild(sectionEl);
  });
}

function onCanvasHover(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(pickableObjects, false);
  const hit = hits.length > 0 ? hits[0].object : null;

  // Don't apply hover effect to the Earth globe
  if (hit === earthRef) return;

  if (hoveredObject === hit) return;
  clearHoverState();
  hoveredObject = hit;

  if (!hoveredObject) return;
  hoveredObject.userData.baseScale = hoveredObject.scale.clone();
  hoveredObject.scale.multiplyScalar(1.2);

  const material = hoveredObject.material;
  if (material && "emissive" in material) {
    hoveredObject.userData.baseEmissive = material.emissive.getHex();
    material.emissive.setHex(0x335577);
  } else if (material && "color" in material) {
    hoveredObject.userData.baseColor = material.color.getHex();
    material.color.offsetHSL(0, 0, 0.15);
  }
}

function clearHoverState() {
  if (!hoveredObject) return;
  const material = hoveredObject.material;

  if (hoveredObject.userData.baseScale) {
    hoveredObject.scale.copy(hoveredObject.userData.baseScale);
  }
  if (material && "emissive" in material && hoveredObject.userData.baseEmissive !== undefined) {
    material.emissive.setHex(hoveredObject.userData.baseEmissive);
  }
  if (material && "color" in material && hoveredObject.userData.baseColor !== undefined) {
    material.color.setHex(hoveredObject.userData.baseColor);
  }
  hoveredObject = null;
}

function addCardinalMarker(label, azDeg) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createTextTexture(label),
      transparent: true,
      depthTest: false,
    }),
  );
  sprite.position.copy(horizontalToCartesian(0, azDeg, SKY_RADIUS - 10));
  sprite.position.y = -7.2;
  sprite.scale.set(4.4, 2.2, 1);
  scene.add(sprite);
}

function createTextTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(6, 18, 36, 0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(120, 190, 255, 0.85)";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = "#e8f5ff";
  ctx.font = "bold 78px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return new THREE.CanvasTexture(canvas);
}

function flattenData(data, prefix = "", out = {}) {
  Object.entries(data).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenData(value, fullKey, out);
    } else {
      out[fullKey] = value;
    }
  });
  return out;
}

function filterByPrefix(source, prefixes) {
  const result = {};
  Object.keys(source).forEach((key) => {
    if (prefixes.some((p) => key.startsWith(p))) {
      result[key] = source[key];
    }
  });
  return result;
}

function prettifyKey(key) {
  const last = key.split(".").pop() ?? key;
  return last.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "-";
  return String(value);
}