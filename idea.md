Building a **full Stellarium clone** is absolutely doable, but it’s not a “single app” problem—it’s a **system architecture problem**. Stellarium itself is essentially:

> 🌌 A real-time 3D sky renderer + astronomical ephemeris engine + time control system + catalog database

So we’ll design yours the same way, but web-based.

---

# 🧠 0. What you are building (real scope)

A full Stellarium clone has 5 core systems:

## 1. 🌌 Sky Renderer (frontend)

* 3D sky dome (WebGL / Three.js)
* Moon, Sun, planets
* Star field (100k–2M stars)
* Atmospheric scattering

## 2. 🧠 Ephemeris Engine (your FastAPI backend)

* Moon/Sun positions (you already started this)
* planetary positions (optional upgrade: VSOP87 / JPL)
* rise/set/transit

## 3. ⏱ Time Engine

* real-time clock
* time scrubber (fast-forward, rewind)
* simulation speed control

## 4. 📡 Data Layer

* star catalog (Hipparcos / Gaia-lite)
* deep sky objects (Messier catalog)
* textures (Moon, planets)

## 5. 🎮 Interaction Layer

* zoom in/out
* click object → info panel
* search sky object

---

# 🧱 1. Final Architecture (Professional-grade)

```text id="stellarium_arch"
stellarium-web/
│
├── backend/
│   ├── app/
│   │   ├── main.py (FastAPI)
│   │   ├── api/
│   │   │   ├── moon.py
│   │   │   ├── sun.py
│   │   │   ├── planets.py
│   │   │   └── sky.py
│   │   │
│   │   ├── core/
│   │   │   ├── ephem_engine.py
│   │   │   ├── moon_engine.py
│   │   │   ├── planet_engine.py
│   │   │
│   │   ├── services/
│   │   │   ├── sky_service.py
│   │   │
│   │   ├── data/
│   │   │   ├── stars.json (or sqlite)
│   │   │   └── messier.json
│   │
│   └── run.py
│
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── skyRenderer.js
│   ├── moonShader.glsl
│   ├── starCatalog.js
│
└── assets/
    ├── moon.jpg
    ├── stars.hdr
```

---

# 🌌 2. Frontend (The REAL Stellarium part)

You will use:

## 🔥 Tech stack

* Three.js (mandatory)
* WebGL shaders
* dat.GUI (controls)
* requestAnimationFrame loop

---

## 🌍 Core concept: SKY DOME

You render everything INSIDE a sphere:

```text id="sky_model"
        🌌 Sky Sphere (inverted normals)
      /                         \
     |   stars + moon + sun     |
      \_________________________/
               observer
```

---

# 🌙 3. Moon rendering (your API integration)

Your API gives:

* RA/DEC
* ALT/AZ
* illumination
* phase

We convert:

```js id="moon_position"
function equatorialToCartesian(ra, dec, distance) {
    const r = THREE.MathUtils.degToRad;

    const raRad = r(ra);
    const decRad = r(dec);

    return new THREE.Vector3(
        distance * Math.cos(decRad) * Math.cos(raRad),
        distance * Math.sin(decRad),
        distance * Math.cos(decRad) * Math.sin(raRad)
    );
}
```

---

# 🌗 4. REAL Moon phase rendering (IMPORTANT)

Instead of images, Stellarium uses lighting math:

## Shader idea:

```glsl id="moon_shader"
uniform vec3 sunDirection;

varying vec3 vNormal;

void main() {
    float light = dot(normalize(vNormal), sunDirection);

    float phase = smoothstep(-0.2, 0.2, light);

    gl_FragColor = vec4(vec3(phase), 1.0);
}
```

👉 This is what makes it look “real-time astronomical”.

---

# 🌟 5. Star system (critical upgrade)

You need a star catalog:

### Option A (lightweight)

* 50k stars (JSON)

### Option B (real Stellarium-level)

* Gaia DR3 subset (millions)

Each star:

```json id="star"
{
  "ra": 10.684,
  "dec": 41.269,
  "mag": 4.5
}
```

Render as:

* point cloud (THREE.Points)
* brightness = magnitude

---

# ⏱ 6. Time engine (THIS is what makes it Stellarium-like)

```js id="time_engine"
let time = new Date();

function updateTime(speed) {
    time = new Date(time.getTime() + speed * 1000);
}
```

Controls:

* pause/play
* fast forward (x10, x100, x1000)
* timeline slider

---

# 🌍 7. Backend APIs (FastAPI)

You will expose:

## 🌙 Moon

```
GET /api/moon?lat=&lon=&time=
```

## ☀️ Sun

```
GET /api/sun?lat=&lon=&time=
```

## 🪐 Planets

```
GET /api/planets?time=
```

## 🌌 Full sky snapshot (IMPORTANT)

```
GET /api/sky?lat=&lon=&time=
```

Returns:

```json id="sky_response"
{
  "moon": {...},
  "sun": {...},
  "planets": [...],
  "stars_visible": [...]
}
```

---

# 🧠 8. Core improvement you MUST add (your current gap)

Right now your system is:

> ❌ object-based (Moon only)

You need:

## ✔ Scene-based model

Instead of:

* moon data
* sun data

You compute:

```text id="scene_model"
SkyScene = {
  observer_location,
  time,
  celestial_objects[],
  lighting_model,
  atmosphere
}
```

---

# 🌫 9. Optional (but important): atmosphere

To look like Stellarium:

Use:

* Rayleigh scattering
* sky color gradient
* horizon haze

Three.js plugins:

* Sky shader (prebuilt or custom)

---

# 🚀 10. Minimal MVP roadmap (VERY IMPORTANT)

Do NOT try full Stellarium at once.

### Phase 1 (you are here)

✔ Moon API (done)
✔ Sun position
✔ structured backend

---

### Phase 2

✔ Three.js sky dome
✔ Moon + Sun rendering

---

### Phase 3

✔ star field
✔ time controller

---

### Phase 4

✔ planets + deep sky objects

---

### Phase 5 (FULL STELLARIUM CLONE)

✔ shaders
✔ atmospheric scattering
✔ catalog system
✔ search UI
✔ full sky simulation

---
