import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const API_BASE = "http://127.0.0.1:8000";
const SKY_RADIUS = 90;

const statusEl = document.getElementById("status");
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

const stars = new THREE.Group();
for (let i = 0; i < 500; i += 1) {
  const p = randomPointOnSphere(SKY_RADIUS - 2);
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  star.position.copy(p);
  stars.add(star);
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

const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.7, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xffd463 }),
);
scene.add(sunMesh);

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
