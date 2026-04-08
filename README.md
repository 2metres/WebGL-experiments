# Wind Vector Map

An interactive WebGL wind simulation that responds to microphone input and webcam motion. Draw trigger paths on screen, then watch arrow fields ripple with audio-driven pulses and camera-detected movement.

## Features

- **Draw trigger paths** — click/touch to paint a grid of directional triggers that shape how forces propagate
- **Microphone input** — audio levels drive rolling pulses along your drawn paths, with beat detection amplifying the effect
- **Camera motion detection** — webcam feed is analyzed for optical flow; detected movement injects velocity into the field
- **Audio-reactive camera** — when both mic and camera are active, audio beats amplify camera-driven motion
- **Velocity field simulation** — GPU-based ping-pong velocity textures with configurable decay and diffusion
- **Multiple render modes** — arrows, digits (0–9), or line characters (─│╱╲)
- **Tunable settings panel** — adjust camera strength, audio boost, velocity decay, diffusion, noise filtering, and more

## How it works

The simulation runs entirely on the GPU using WebGL 1 with instanced rendering:

1. A **trigger grid** stores directional forces placed by the user's drawn strokes
2. A **motion detection shader** compares consecutive camera frames to produce a motion vector field
3. A **velocity update shader** combines trigger forces, camera motion, audio levels, and existing velocity with decay
4. A **diffusion pass** spreads velocity to neighboring cells
5. An **arrow rendering pass** draws instanced glyphs oriented and colored by the velocity field

## Running

```bash
npm install
npm run dev
```

## Tech

Svelte 5 + TypeScript + Vite + raw WebGL (no Three.js)
