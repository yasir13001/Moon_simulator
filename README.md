# Moon_simulator

Refined Stellarium-style MVP with a scene-based astronomy API.

## Implemented

- `GET /api/moon?lat=&lon=&time=` structured Moon ephemeris output
- `GET /api/sun?lat=&lon=&time=` structured Sun ephemeris output
- `GET /api/sky?lat=&lon=&time=` scene snapshot with moon + sun + lighting model

## Run

```bash
python -m pip install -r requirements.txt
python backend/run.py
```

Open: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Viewer: [http://127.0.0.1:8000/viewer](http://127.0.0.1:8000/viewer)
