export interface AnimationLoop {
  start: () => void;
  stop: () => void;
}

export function createAnimationLoop(callback: (dt: number) => void): AnimationLoop {
  let frameId = 0;
  let lastTime = 0;
  let running = false;

  function loop(now: number) {
    if (!running) return;
    const dt = lastTime ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    callback(dt);
    frameId = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = 0;
      frameId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frameId);
    },
  };
}
