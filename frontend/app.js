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
  1000,
);
camera.position.set(0, 5, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
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
controls.maxDistance = 120;

const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);
const sunLight = new THREE.DirectionalLight(0xfff2c1, 1.2);
scene.add(sunLight);

const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({
  color: 0x03030a,
  side: THREE.BackSide,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

// Horizon and ocean references so the observer has orientation cues.
const ocean = new THREE.Mesh(
  new THREE.CircleGeometry(70, 96),
  new THREE.MeshPhongMaterial({
    color: 0x0d2f59,
    shininess: 40,
    specular: 0x315c88,
    transparent: true,
    opacity: 0.9,
  }),
);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -8;
scene.add(ocean);

const horizonRing = new THREE.Mesh(
  new THREE.RingGeometry(69.4, 70.1, 128),
  new THREE.MeshBasicMaterial({
    color: 0x4f80c4,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  }),
);
horizonRing.rotation.x = -Math.PI / 2;
horizonRing.position.y = -7.98;
scene.add(horizonRing);

const grid = new THREE.GridHelper(120, 24, 0x2d5f97, 0x1a3357);
grid.position.y = -7.95;
grid.material.transparent = true;
grid.material.opacity = 0.25;
scene.add(grid);

addCardinalMarker("N", 0);
addCardinalMarker("E", 90);
addCardinalMarker("S", 180);
addCardinalMarker("W", 270);

const earthRef = new THREE.Mesh(
  new THREE.SphereGeometry(5, 32, 32),
  new THREE.MeshPhongMaterial({
    color: 0x1d4f82,
    emissive: 0x071222,
    shininess: 12,
  }),
);
earthRef.position.set(0, -18, -20);
scene.add(earthRef);

const earthCloudBand = new THREE.Mesh(
  new THREE.SphereGeometry(5.08, 24, 24),
  new THREE.MeshBasicMaterial({
    color: 0xb3d2ff,
    transparent: true,
    opacity: 0.12,
  }),
);
earthCloudBand.position.copy(earthRef.position);
scene.add(earthCloudBand);

const stars = new THREE.Group();
for (let i = 0; i < 500; i += 1) {
  const p = randomPointOnSphere(SKY_RADIUS - 2);
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  star.position.copy(p);
  star.userData.name = `Star ${i + 1}`;
  stars.add(star);
  pickableObjects.push(star);
}
scene.add(stars);

const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 32, 32),
  new THREE.MeshStandardMaterial({
    color: 0xbcbcbc,
    roughness: 0.95,
    metalness: 0.0,
  }),
);
scene.add(moonMesh);
moonMesh.userData.name = "Moon";
pickableObjects.push(moonMesh);

const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.7, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xffd463 }),
);
scene.add(sunMesh);
sunMesh.userData.name = "Sun";
pickableObjects.push(sunMesh);
pickableObjects.push(earthRef);
earthRef.userData.name = "Earth";

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

  earthRef.rotation.y += deltaSeconds * 0.08;
  earthCloudBand.rotation.y += deltaSeconds * 0.1;
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

  const light = moonSnap0Light + (moonSnap1Light - moonSnap0Light) * t;
  moonMesh.material.color.setRGB(0.2 + light, 0.2 + light, 0.22 + light);
  sunLight.position.copy(sunMesh.position).normalize();
  sunLight.intensity = Math.max(0.2, Math.min(1.5, light + 0.3));

  // Fade stars based on sun altitude.
  // Fully visible below -6° (astronomical twilight), fully hidden above +6°.
  const sunAltDeg = sunSnap0AltDeg + (sunSnap1AltDeg - sunSnap0AltDeg) * t;
  const starOpacity = Math.max(0, Math.min(1, (-sunAltDeg - 6) / 12 + 1));
  stars.children.forEach((star) => {
    star.material.opacity = starOpacity;
    star.material.transparent = true;
    star.visible = starOpacity > 0.01;
  });

  // Sky colour gradient keyed to sun altitude:
  //  below -18° : deep night   #000006
  //  -18° → -6° : twilight     #000006 → #1a0a2e (deep purple)
  //   -6° →  0° : civil dawn   #1a0a2e → #c0471a (orange-red horizon)
  //    0° →  8° : sunrise      #c0471a → #e8a030 (warm amber)
  //    8° → 20° : morning      #e8a030 → #4a90d9 (sky blue)
  //   above 20° : full day     #4a90d9 → #1a6ecf (deep blue)
  const skyStops = [
    { alt: -18, color: new THREE.Color(0x000006) },
    { alt:  -6, color: new THREE.Color(0x1a0a2e) },
    { alt:   0, color: new THREE.Color(0xc0471a) },
    { alt:   8, color: new THREE.Color(0xe8a030) },
    { alt:  20, color: new THREE.Color(0x4a90d9) },
    { alt:  90, color: new THREE.Color(0x1a6ecf) },
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