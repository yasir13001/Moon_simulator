# Idea refinement from idea.md
_Exported on 4/29/2026 at 12:59:29 GMT+5 from Cursor (3.2.11)_

---

**User**

see the idea.md file, refine the idea that it suggest and execute

---

**Cursor**

I’ll open `idea.md` first, turn its suggestion into a concrete implementation plan, and then apply the code changes directly in this repo. I’m starting by reading that file and scanning the project structure.

I found a concrete actionable part in `idea.md`: standardize the Moon API output with a conversion layer and scene-ready response shape. Next I’m inspecting the current backend files to wire this in with minimal disruption.

The repo is minimal right now and mostly centers on `calculations.ipynb`, so I’ll implement the refined idea directly there by adding a conversion layer plus a structured Moon-output formatter and derived parameters. I’m reading the notebook content now.

I’m now applying edits in `calculations.ipynb`: adding reusable conversion helpers, a `format_moon_output` function that produces renderer-ready JSON, and updating the run cell to print both raw and refined output.

I’ve finished the notebook refactor and will now execute the notebook so the refined output is actually produced, not just written.

I tried running it, but execution is blocked by missing runtime dependencies (`ephem`/Jupyter tooling). I’ll install the needed package(s) and re-run so this actually executes on your machine.

Implemented and executed a refined version of the `idea.md` recommendation in `calculations.ipynb`.

### What I refined from `idea.md`
I focused the broad Stellarium roadmap into an immediate, concrete backend step:  
- add a **conversion layer** (radians/AU/ephem dates -> degrees/km/ISO datetime),  
- return a **scene/renderer-friendly structured Moon payload**,  
- include the 3 suggested derived values:
  - `phase_angle_deg`
  - `terminator_tilt_deg`
  - `visibility_score`

### Changes made
Updated `calculations.ipynb` to include:

- **Conversion helpers**
  - `rad_to_deg()`
  - `rad_to_hours()`
  - `au_to_km()`
  - `ephem_to_iso()`
- **Raw extraction**
  - `get_moon_raw_parameters(...)`
- **Structured formatter**
  - `format_moon_output(raw)` returning grouped sections:
    - `meta`
    - `position` (`equatorial`, `geocentric`, `horizontal`)
    - `phase`
    - `distance`
    - `libration`
    - `appearance`
    - `visibility`
    - `solar_geometry`
- **Runner cell update**
  - prints both raw table + normalized JSON output

### Execution status
- I attempted notebook execution with `jupyter nbconvert`, but `jupyter` was not installed in the shell.
- I installed required Python deps (`ephem`, `numpy`, `pandas`, `pytz`).
- Then I executed the same logic via Python directly, and it ran successfully, producing structured JSON output (including converted units and derived parameters).

If you want, next I can extract this notebook logic into a clean API module layout (e.g. `app/utils/conversions.py` + `app/services/moon_formatter.py`) so it’s ready for FastAPI endpoints.

---

**User**

now read again the idea.md file , refine the idea, and execute it

---

**Cursor**

I’ll re-read `idea.md` from top to bottom, tighten it into a practical MVP slice, and execute that slice in code right away (not just document it). I’m starting by pulling the latest file contents.

I’m refining this into a concrete MVP: a real FastAPI backend with `/api/moon`, `/api/sun`, and scene-based `/api/sky`, reusing the normalization work you asked for. I’ll create the backend structure now, then run it with a smoke test call.

I’ve implemented the refined MVP as an actual backend service. Next I’m executing it with dependency install plus an API smoke test against `/api/sky` to confirm it runs end-to-end.

I hit an import-path issue while executing (`app` vs `backend.app`). I’m fixing imports to a single package path and re-running the endpoint test.

Refined `idea.md` into a concrete, executable MVP and implemented it.

### Refinement I applied
Instead of trying full Stellarium scope at once, I narrowed the plan to a **scene-based backend core** (the key gap in `idea.md`):
- standardized astronomical conversions,
- structured Moon and Sun API responses,
- a unified sky scene endpoint for renderer consumption.

### Executed implementation
Created a working FastAPI backend:

- `backend/app/main.py`
- `backend/app/api/moon.py`
- `backend/app/api/sun.py`
- `backend/app/api/sky.py`
- `backend/app/core/ephem_engine.py`
- `backend/app/services/sky_service.py`
- `backend/app/utils/conversions.py`
- `backend/run.py`
- `requirements.txt`
- updated `README.md` with run instructions

### Endpoints now available
- `GET /api/moon?lat=&lon=&time=`
- `GET /api/sun?lat=&lon=&time=`
- `GET /api/sky?lat=&lon=&time=`

`/api/sky` now returns a scene object:
- `observer_location`
- `time`
- `celestial_objects` (`moon`, `sun`)
- `lighting_model`
- `atmosphere` (placeholder for later upgrade)

### Execution proof
I installed dependencies and ran a smoke test with FastAPI `TestClient`:
- status: `200`
- response keys: `observer_location`, `time`, `celestial_objects`, `lighting_model`, `atmosphere`
- object types returned: `moon`, `sun`

### Run locally
```bash
python -m pip install -r requirements.txt
python backend/run.py
```
Then open: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Next logical step is Phase 2 from your idea: add a minimal `frontend/` Three.js sky viewer that consumes `/api/sky`.

---

**User**

ModuleNotFoundError: No module named 'backend'

---

**Cursor**

That error is from import paths expecting `backend` as an installed package. I’ll switch the backend to local package imports (`app...`) so it runs directly from this repo without needing module installation.

Fixed. The import path now no longer depends on a `backend` top-level module.

### What changed
- Switched imports back to local app package:
  - `backend/app/main.py` uses `from app.api...`
  - API/service files use `from app....`
- Updated runner target:
  - `backend/run.py` now uses `uvicorn.run("app.main:app", ...)`

### Verified
From `backend/`, this now works and returns 200 for `/api/sky`.

### How to run
Use either:
- `python backend/run.py` (from repo root), or
- `cd backend && python run.py`

If you still get an import error, share the exact command you ran and I’ll align paths to that exact flow.

---

**User**

provide example endpoints for karachi

---

**Cursor**

Use Karachi coordinates: `lat=24.8607`, `lon=67.0011`.

- Moon (current time):
  - `http://127.0.0.1:8000/api/moon?lat=24.8607&lon=67.0011`
- Sun (current time):
  - `http://127.0.0.1:8000/api/sun?lat=24.8607&lon=67.0011`
- Sky scene (current time):
  - `http://127.0.0.1:8000/api/sky?lat=24.8607&lon=67.0011`

With a specific time (`UTC` ISO format):

- Moon:
  - `http://127.0.0.1:8000/api/moon?lat=24.8607&lon=67.0011&time=2026-04-29T04:00:00Z`
- Sun:
  - `http://127.0.0.1:8000/api/sun?lat=24.8607&lon=67.0011&time=2026-04-29T04:00:00Z`
- Sky:
  - `http://127.0.0.1:8000/api/sky?lat=24.8607&lon=67.0011&time=2026-04-29T04:00:00Z`

Quick `curl` example:

```bash
curl "http://127.0.0.1:8000/api/sky?lat=24.8607&lon=67.0011&time=2026-04-29T04:00:00Z"
```

If you want, I can also give you a Postman collection JSON for these 3 Karachi endpoints.

---

**User**

I tested all of the endpoints, now go forward with the plan

---

**Cursor**

Great — since backend endpoints are validated, I’ll execute Phase 2 from the plan: build a minimal Three.js sky viewer that consumes `/api/sky` (moon + sun rendering, time control, live updates). I’m creating the frontend files and wiring them to your API now.

I’m adding the interactive viewer logic now: star dome, moon/sun sprites, camera controls, and time-speed simulation that polls `/api/sky`.

I fixed a path bug so `/viewer` works regardless of where you run Python from. I’m re-running the smoke test now.

Phase 2 is now executed.

Implemented a working frontend sky viewer connected to your backend plan:

- Added `frontend/index.html` with controls for:
  - Karachi-ready lat/lon
  - simulation speed (`pause`, `1x`, `10x`, `100x`)
- Added `frontend/app.js` with:
  - Three.js sky dome + stars
  - Moon and Sun rendering
  - live polling of `/api/sky`
  - time simulation loop and status telemetry
- Updated `backend/app/main.py`:
  - enabled CORS
  - mounted static viewer at `/viewer`
  - made frontend path robust regardless of current working directory
- Updated `README.md` with viewer URL.

### Verified end-to-end
Smoke tests pass:

- `GET /viewer` -> `200` (`text/html`)
- `GET /api/sky?lat=24.8607&lon=67.0011` -> `200`

### Use it
1. Run backend:
   - `python backend/run.py`
2. Open:
   - API docs: `http://127.0.0.1:8000/docs`
   - Viewer: `http://127.0.0.1:8000/viewer`

If you want, I’ll continue with Phase 3 next: real star catalog ingestion + brightness by magnitude + timeline slider UI.

---

**User**

The view in the viewer is just the dark sky, for the frame of reference add earth or ocean to get the right perspective

---

**Cursor**

I’ll improve the viewer perspective by adding a visible Earth/ocean reference and horizon grid, so the sky no longer feels like an empty black sphere. I’m editing the scene setup in `frontend/app.js` now.

Added a proper frame of reference to the viewer so it no longer feels like a floating dark void.

### What changed in `frontend/app.js`
- Added an **ocean plane** below the observer.
- Added a glowing **horizon ring**.
- Added a subtle **horizon grid** for orientation.
- Added a small rotating **Earth reference globe** (with light cloud shell) in view.
- Animated Earth/cloud rotation each frame.

This gives you visible “up/down” and horizon context while keeping the sky simulation intact.

Reload `http://127.0.0.1:8000/viewer` and you should immediately see the difference.  
If you want, next I can add **N/E/S/W horizon markers** and a toggle to show/hide the reference layers.

---

**User**

when I click on sun or any object the metadata of that object must get showed on the side

---

**Cursor**

I’ll add object picking with a side metadata panel: clicking the Sun, Moon, Earth reference, or stars will open details on the right using live `/api/sky` data where available. I’m updating both `frontend/index.html` and `frontend/app.js`.

Implemented — clicking objects now shows metadata in a right-side panel.

### What you can click
- `Moon` -> live Moon metadata from `/api/sky`
- `Sun` -> live Sun metadata from `/api/sky`
- `Earth reference` -> viewer/orientation metadata
- `Stars` -> synthetic star metadata (local placeholder for now)

### Files updated
- `frontend/index.html`
  - Added right-side `Object Metadata` panel.
- `frontend/app.js`
  - Added raycasting click detection.
  - Added pickable object registration.
  - Stores latest sky API response and renders object metadata as JSON.

Refresh `http://127.0.0.1:8000/viewer` and click on objects to inspect details.

Next, I can make this cleaner by formatting key fields (altitude, azimuth, illumination, rise/set) in a human-friendly layout instead of raw JSON.

---

**User**

metadata is showing in dict format, present this in aesthetic way

---

**Cursor**

I’ll upgrade the metadata panel to a styled card layout (sections, labels, values) instead of raw JSON text. I’m updating the panel markup/CSS and replacing the renderer in `app.js`.

Done — metadata is now presented as a clean visual panel instead of raw dict/JSON.

### Improvements made
- Styled right panel with:
  - section cards
  - title + timestamp
  - key/value rows
- Auto-grouped fields into:
  - `Position`
  - `Visibility`
  - `Phase`
  - `Other`
- Added friendly formatting:
  - readable labels (`rise_time` -> `Rise Time`)
  - rounded numeric values
  - boolean display as `Yes/No`

### Files updated
- `frontend/index.html` (panel styles + metadata container)
- `frontend/app.js` (new aesthetic metadata renderer)

Refresh `http://127.0.0.1:8000/viewer` and click an object again — it should now look much more polished and readable.

---

**User**

plan next move

---

**Cursor**

## Next Move Plan

- **Stabilize current viewer UX (quick win, 1 session)**  
  Add N/E/S/W horizon markers, object hover highlight, and a “follow selected object” camera toggle.

- **Phase 3 core: real star catalog (highest impact, 1-2 sessions)**  
  Add a lightweight star dataset (`~5k-20k` stars), render with `THREE.Points`, and map brightness by magnitude so the sky looks astronomically meaningful.

- **Time controls upgrade (same phase, 1 session)**  
  Add timeline slider + play/pause + jump-to-now + speed presets in UI, while keeping backend `time` query authoritative.

- **Metadata panel v2 (1 session)**  
  Add tabs: `Overview`, `Position`, `Visibility`; include units, mini trend arrows (rising/setting), and copy/share snapshot JSON button.

- **Performance + correctness pass (1 session)**  
  Throttle API fetch smarter, interpolate object motion between fetches, and add backend caching per `(lat, lon, rounded_time)`.

- **Validation and trust layer (ongoing)**  
  Add a small regression test set for Karachi at fixed times; verify moon/sun alt-az values remain stable after refactors.

## Recommended immediate next task
Start with **real star catalog integration** first, because it gives the largest visual leap and unlocks better object search/filter next.

If you want, I can execute that now as **Phase 3.1**:
1) add a starter star catalog file,  
2) backend endpoint for visible stars,  
3) frontend `THREE.Points` rendering with magnitude-based size/alpha.

---

**User**

do this first:Stabilize current viewer UX (quick win, 1 session)

---

**Cursor**

Perfect — I’ll implement those three UX stabilizers now: **cardinal horizon markers (N/E/S/W)**, **hover highlight on objects**, and a **follow-selected-object toggle** tied to click selection.

Completed the UX stabilization slice.

### Added
- **Cardinal horizon markers**: `N`, `E`, `S`, `W` now render around the horizon.
- **Hover highlight**: hovering Moon/Sun/Earth/stars now visually emphasizes the object.
- **Follow selected object**: new camera mode in the left panel:
  - `Do not follow selected object`
  - `Follow selected object`
  - Click an object, and camera target smoothly tracks it when follow mode is on.

### Updated files
- `frontend/index.html`
- `frontend/app.js`

### Verified
- `/viewer` still serves correctly (`200`).

Refresh `http://127.0.0.1:8000/viewer` and test:
1) hover any object,  
2) click Moon/Sun,  
3) set camera mode to follow.

---

**User**

do this first: Time controls upgrade (same phase, 1 session)

do this first: Time controls upgrade (same phase, 1 session)

---

**Cursor**

I’ll implement the time-controls upgrade directly in the viewer: **play/pause**, **jump to now**, and a **timeline slider** tied to the API `time` parameter so backend stays authoritative. I’m updating the frontend controls and simulation logic now.

I’m wiring those controls into the simulation loop next: pause/play state, slider scrubbing, jump-to-now, and manual datetime input — all feeding the `/api/sky?time=` query.

Time-controls upgrade is implemented.

### Added to viewer
- **Play/Pause button** (independent from speed)
- **Jump To Now** button
- **Set Time (local)** datetime picker
- **Timeline slider** (`-24h` to `+24h` from now) with live label

### Behavior
- When playing, simulation time advances by selected speed (`1x`, `10x`, `100x`).
- Scrubbing timeline or choosing a datetime:
  - sets simulation to that time,
  - auto-pauses simulation for precise inspection.
- Every API call still uses `time` from the simulated clock (`/api/sky?...&time=...`), so backend remains authoritative.

### Files updated
- `frontend/index.html`
- `frontend/app.js`

### Verified
- `/viewer` still serves correctly (`200`).

If you want, next I can add **keyboard shortcuts** (`space` play/pause, `N` jump now, arrows for timeline step) for even faster time navigation.

---

**User**

add a search bar to search object by name and animate the object coming into the view

---

**Cursor**

I’ll add a search UI to the viewer and wire it to object selection. When you search (e.g. `Moon`, `Sun`), the viewer will smoothly move the camera target so that object comes into view, and it will also show the object metadata in the side panel.

Search bar + “fly-to” animation is added to the viewer.

### What you can do
- Type `Moon`, `Sun`, or `Earth` in **Search Object** and click **Find** (or press Enter).
- The camera smoothly animates to that object and the selected object metadata updates on the right.
- If you type something like `Star 12`, it will match the synthetic stars too (best-effort).

### Files changed
- `frontend/index.html`: added the search UI.
- `frontend/app.js`: implemented object name matching + `flyTargetTo()` camera animation + selection/metadata update.

Refresh and try: `http://127.0.0.1:8000/viewer`

---

**User**

Read celestial_object_tracker_integration.md file and execute

---

**Cursor**

I’ll locate `celestial_object_tracker_integration.md`, read it fully, then implement whatever integration steps it specifies in the viewer/backend code.

I’ve got the integration instructions from `celestial_object_tracker_integration.md`: the GUI should send `GET http://192.168.4.1/move?az=...&alt=...`. Since browsers often hit CORS blocks directly, I’ll execute this properly by adding a backend relay endpoint in FastAPI, then update the viewer UI to send/track via that relay. I’m about to implement the relay and wire the “Send/Track” controls.

I’ll now wire the ESP8266 integration “for real”: add a backend relay endpoint (`/api/esp/move`) and extend the viewer UI with auto-track + manual “Send Moon to ESP”. Then the browser will push az/alt updates to your ESP exactly in the format from the integration doc.

Implemented the integration described in `celestial_object_tracker_integration.md` by wiring the viewer to send Moon az/alt to your ESP8266 **via HTTP GET** (through the FastAPI backend to avoid browser CORS issues).

### What I added (executed)

#### 1) Backend relay endpoint (HTTP GET)
**New endpoint:** `GET /api/esp/move?az=...&alt=...`

It forwards to the ESP URL:
`http://192.168.4.1/move?az=...&alt=...`

Clamps values for safety to:
- `az` in `0..360`
- `alt` in `0..90`

**Files added/updated**
- `backend/app/api/esp.py` (new)
- `backend/app/main.py` (includes the router)

#### 2) Viewer UI: “Send Moon to ESP” + Auto Track
**New controls** in the left panel:
- `Send Moon to ESP`
- `Auto Track (Moon)` with `Every 5s / Every 10s / Off`
- Shows the latest `Moon Azimuth (deg)` and `Moon Altitude (deg)` values
- `ESP status` output text

**File updated**
- `frontend/index.html`
- `frontend/app.js`

When auto-track is on, the viewer periodically sends the latest Moon az/alt to `/api/esp/move`.

### Smoke tests
- Confirmed `/viewer` and `/api/sky` still return `200`.
- Confirmed `/api/esp/move` exists and returns a structured JSON response (it will show `ok: False` if the ESP at `192.168.4.1` isn’t reachable from your machine).

Next step (only if needed): tell me whether your ESP expects **absolute** (`moveTo`) or **relative** (`move`) behavior for tracking; then we can align the backend relay if your firmware supports only one.

---

**User**

relative(move)

---

**Cursor**

Got it: the ESP firmware uses `move()` as **relative movement**, so we must stop sending absolute az/alt and instead send **deltas** between successive Moon positions. I’ll update the frontend tracking logic to compute `daz/dalt` safely (wrap-around for azimuth) and add a “baseline” so the first relative move doesn’t jump wildly.

Implementing the relative-move tracking correctly now: I’ll add a “baseline” so the first relative command doesn’t assume an unknown starting mount position, then I’ll send `daz/dalt` deltas to the backend, and update the backend relay to accept `relative=true` (clamping deltas appropriately).

Good catch: the backend relay endpoint still clamps values as if they were absolute az/alt. I’ll update `backend/app/api/esp.py` so it supports `relative=true` and clamps az/alt deltas to safe ranges, matching the relative `move()` behavior you confirmed.

Updated the ESP integration to match **relative `move()`** behavior.

### What I changed

#### 1) Frontend tracking now sends `daz/dalt` (deltas), not absolute az/alt
- Added a **baseline** concept so the first relative move doesn’t create a huge jump.
- New button: **`Set Tracking Baseline (no move)`**
- Auto-track:
  - If baseline is not set yet, it **sets baseline and waits** for the next tick.
  - After that, each interval sends:
    - `daz = az_now - az_lastSent` (wrapped to avoid 0/360 jumps)
    - `dalt = alt_now - alt_lastSent`

#### 2) Backend relay supports `relative=true`
- `GET /api/esp/move` now accepts query param `relative`:
  - `relative=false` (default): clamps absolute az `[0..360]`, alt `[0..90]`
  - `relative=true`: clamps deltas az `[-180..180]`, alt `[-90..90]`
- Frontend sends `relative=true`.

### Files updated
- `frontend/index.html`
- `frontend/app.js`
- `backend/app/api/esp.py`

### How to use (important)
1. Connect to your ESP WiFi.
2. In the viewer, click **`Set Tracking Baseline (no move)`**.
3. Turn on **Auto Track (Moon)** (e.g. every 5s).
4. It will start moving using relative deltas.

If you tell me the expected sign convention your ESP uses for negative alt (some mounts treat them differently), I can adjust the delta handling.

---

**User**

how can I test this without connecting esp8266

---

**Cursor**

I’ll make testing offline straightforward by (1) letting the ESP relay URL be overridden via an environment variable, and (2) adding a small local “mock ESP” server that responds to `/move`. Then you can test forwarding + relative deltas without any ESP hardware.

Now I’ll run the mock ESP server in the background, point the backend’s ESP relay to it via `ESP_BASE_URL`, and call `/api/esp/move` to verify that forwarding works and that relative deltas are passed through.

You can test everything (including the “forward to ESP” part) without connecting the ESP8266 by using a local mock server.

## 1) Use the mock ESP server
I added `mock_esp_server.py` in your repo. Run it:

```bash
python mock_esp_server.py
```

It serves a fake endpoint at:
- `http://127.0.0.1:8081/move`  
and responds with plain text like `MOVING az=... alt=...`

## 2) Point the backend relay to the mock
Your backend now reads an env var `ESP_BASE_URL`.

From PowerShell, set:

```powershell
$env:ESP_BASE_URL="http://127.0.0.1:8081"
```

Then call your relay endpoint normally (relative mode too):

```bash
curl "http://127.0.0.1:8000/api/esp/move?az=12.3&alt=4.5&relative=true"
```

You should get JSON like:
- `ok: true`
- `response: "MOVING az=... alt=..."`

## 3) Verify relative-move delta logic
In the viewer, use:
- **Set Tracking Baseline (no move)**
- **Auto Track (Moon)**

With the mock running, the backend will forward your computed `daz/dalt` deltas to the mock `/move`, so you can confirm the delta math is sane—without real motors.

If you want, I can also add a viewer toggle to “log last sent daz/dalt” more explicitly for debugging.

---

**User**

drop the mock test

---

**Cursor**

Understood—I'll remove the mock ESP server from the repo and stop the mock process if it’s still running, so only the real relay/testing approach remains.

Removed the mock test.

- Deleted `mock_esp_server.py` from `D:/code/Moon_simulator/`.
- Killed the mock server process (PID `20108`) so nothing is listening on `8081` anymore.

Your ESP relay integration (`/api/esp/move`) remains in place and still supports `relative=true` for `move()` (relative motion), but it will now only forward to the real ESP target (`http://192.168.4.1` by default).

---

**User**

<timestamp>Wednesday, Apr 29, 2026, 12:44 PM (UTC+5)</timestamp>
<system_notification>
The following task has finished. If you were already aware, ignore this notification and do not restate prior responses.

<task>
kind: shell
status: error
task_id: 944392
title: Start mock ESP server
detail: exit_code=1
output_path: C:\Users\Yasir Khan\.cursor\projects\d-code-Moon-simulator\terminals\944392.txt
</task>
</system_notification>
<user_query>Briefly inform the user about the task result and perform any follow-up actions (if needed).</user_query>

---

**Cursor**

The system says the mock ESP server task finished with exit_code 1. I already killed it and deleted the file, so I’ll just confirm it didn’t stay running. No further action needed.The mock ESP server task (`mock_esp_server.py`) exited with `exit_code=1`, so it did **not** keep running. I’ve already stopped the previously running mock process (PID `20108`) and deleted `mock_esp_server.py`, so the repo is now clean and the viewer/backend will target the real ESP (`http://192.168.4.1`) by default.

---

**User**

do this: Performance + correctness pass (1 session)
Throttle API fetch smarter, interpolate object motion between fetches, and add backend caching per (lat, lon, rounded_time).

---

**Cursor**

I’m going to implement the requested performance/correctness improvements now: (1) add backend caching for Moon/Sun ephemeris keyed by `(lat, lon, rounded_time)`, and (2) upgrade the frontend to throttle fetches based on simulated time and smoothly interpolate Moon/Sun motion between API responses.

I’m doing a quick correctness hardening to prevent out-of-order/overlapping `/api/sky` responses during rapid timeline scrubbing. I’ll queue a single “force refresh” fetch if one is already in flight, so interpolation snaps always correspond to the latest user-selected time.

Done — I applied the **Performance + correctness pass** across both backend and viewer.

### Backend: caching ephemeris
- Updated `backend/app/core/ephem_engine.py` to cache **raw Moon/Sun computations** keyed by:
  - `(lat rounded to 4 decimals, lon rounded to 4 decimals, rounded_time)`  
  - where `rounded_time` is in **5-second bins** and entries expire after **20s**.
- This reduces repeated recomputation when the viewer polls frequently.

### Frontend: smarter throttling + interpolation
- Updated `frontend/app.js` to:
  1. **Throttle API fetches smarter**
     - Fetch only when **simulated time advanced by ≥ 2000 ms**, or if real time exceeds a cap (**2500 ms**).
     - When paused, it won’t keep polling unless you explicitly scrub/jump (which calls `force`).
     - Added a **simple correctness queue** so if a forced fetch is requested mid-flight, it triggers exactly one fresh fetch after the current one completes (avoids out-of-order snapshot glitches).
  2. **Interpolate Moon/Sun motion**
     - Instead of snapping positions on each fetch, the viewer keeps **two snapshot states** (`prev` and `next`) and linearly blends:
       - Moon position (alt/az -> 3D vector)
       - Sun position
       - Moon illumination-based color (blended too)

### Smoke check
- Verified `/api/sky` and `/api/moon` continue to work after caching changes.

Changed files:
- `backend/app/core/ephem_engine.py`
- `frontend/app.js`

