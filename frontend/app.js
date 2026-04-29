import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const API_BASE = "http://127.0.0.1:8000";
const SKY_RADIUS = 90;

const statusEl = document.getElementById("status");
const metadataContentEl = document.getElementById("metadataContent");
const latEl = document.getElementById("lat");
const lonEl = document.getElementById("lon");
const speedEl = document.getElementById("speed");
const applyBtn = document.getElementById("apply");

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
pickableObjects.push(moonMesh);

const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.7, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xffd463 }),
);
scene.add(sunMesh);
pickableObjects.push(sunMesh);
pickableObjects.push(earthRef);

let location = {
  lat: Number.parseFloat(latEl.value),
  lon: Number.parseFloat(lonEl.value),
};
let simTimeMs = Date.now();
let simSpeed = Number.parseFloat(speedEl.value);
let lastFrameMs = performance.now();
let lastFetchMs = 0;

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

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
renderer.domElement.addEventListener("click", onCanvasClick);

setStatus("Initializing viewer...");
fetchSky(true);
animate();

function animate(now = performance.now()) {
  const deltaSeconds = (now - lastFrameMs) / 1000;
  lastFrameMs = now;
  simTimeMs += deltaSeconds * simSpeed * 1000;

  if (now - lastFetchMs > 1200) {
    fetchSky(false);
    lastFetchMs = now;
  }

  controls.update();
  earthRef.rotation.y += deltaSeconds * 0.08;
  earthCloudBand.rotation.y += deltaSeconds * 0.1;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

async function fetchSky(force) {
  try {
    const timeIso = new Date(simTimeMs).toISOString();
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
    applySkySnapshot(sky);

    const moon = sky.celestial_objects.find((o) => o.type === "moon")?.data;
    const sun = sky.celestial_objects.find((o) => o.type === "sun")?.data;
    const moonAlt = moon?.position?.horizontal?.altitude_deg ?? 0;
    const illum = moon?.phase?.illumination_fraction ?? 0;
    const sunAlt = sun?.position?.horizontal?.altitude_deg ?? 0;
    setStatus(
      `${new Date(simTimeMs).toLocaleString()} | Moon alt ${moonAlt.toFixed(1)}° | Illum ${(illum * 100).toFixed(1)}% | Sun alt ${sunAlt.toFixed(1)}°`,
    );
  } catch (error) {
    if (force) {
      setStatus(`Unable to fetch /api/sky: ${error.message}`);
    }
  }
}

function applySkySnapshot(sky) {
  const moon = sky.celestial_objects.find((o) => o.type === "moon")?.data;
  const sun = sky.celestial_objects.find((o) => o.type === "sun")?.data;
  if (!moon || !sun) return;

  const moonAlt = moon.position.horizontal.altitude_deg;
  const moonAz = moon.position.horizontal.azimuth_deg;
  const sunAlt = sun.position.horizontal.altitude_deg;
  const sunAz = sun.position.horizontal.azimuth_deg;

  moonMesh.position.copy(horizontalToCartesian(moonAlt, moonAz, SKY_RADIUS - 8));
  sunMesh.position.copy(horizontalToCartesian(sunAlt, sunAz, SKY_RADIUS - 12));

  const moonLight = moon.phase.illumination_fraction;
  moonMesh.material.color.setRGB(0.2 + moonLight, 0.2 + moonLight, 0.22 + moonLight);
  sunLight.position.copy(sunMesh.position).normalize();
  sunLight.intensity = Math.max(0.2, Math.min(1.5, moonLight + 0.3));
}

function horizontalToCartesian(altDeg, azDeg, radius) {
  const alt = THREE.MathUtils.degToRad(altDeg);
  const az = THREE.MathUtils.degToRad(azDeg);
  const x = radius * Math.cos(alt) * Math.sin(az);
  const y = radius * Math.sin(alt);
  const z = radius * Math.cos(alt) * Math.cos(az);
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

function onCanvasClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(pickableObjects, false);
  if (hits.length === 0) return;

  const hit = hits[0].object;
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
