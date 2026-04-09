export class AudioCapture {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private _isActive = false;
  private prevLevel = 0;
  private _level = 0;
  private _low = 0;
  private _high = 0;

  // Auto-gain: track recent peaks per band, decay over ~2s
  private peakLevel = 0.01;
  private peakLow = 0.01;
  private peakHigh = 0.01;
  private readonly PEAK_DECAY = 0.995; // per-frame decay (~2s half-life at 60fps)

  // BPM detection
  private _bpm = 0;
  private energyHistory: number[] = [];
  private beatTimestamps: number[] = [];
  private lastBeatTime = 0;
  private energyThreshold = 0;
  private readonly BEAT_COOLDOWN = 200; // ms between beats minimum
  private readonly BPM_WINDOW = 8000; // ms of beat history to consider
  private readonly ENERGY_HISTORY_SIZE = 43; // ~0.7s at 60fps

  /** Rolling history of audio deltas — maps along the path */
  readonly historySize = 256;
  private history = new Float32Array(256);
  private historyHead = 0;

  get isActive() {
    return this._isActive;
  }

  /** Current audio level (0-1), updated each frame via updateHistory() */
  get level() {
    return this._level;
  }

  /** Low frequency band level (~0-700Hz), updated each frame via updateHistory() */
  get low() {
    return this._low;
  }

  /** High frequency band level (~5kHz+), updated each frame via updateHistory() */
  get high() {
    return this._high;
  }

  /** Detected BPM from onset detection, 0 if not enough data */
  get bpm() {
    return this._bpm;
  }

  async start(existingStream?: MediaStream): Promise<boolean> {
    try {
      const stream = existingStream ?? await navigator.mediaDevices.getUserMedia({ audio: true });
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.15;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

      this.source = this.context.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      // Resume AudioContext in case browser suspended it
      if (this.context.state === "suspended") {
        await this.context.resume();
      }

      this._isActive = true;
      return true;
    } catch (e) {
      console.warn("Mic access denied or unavailable:", e);
      return false;
    }
  }

  /** Push a new frame of audio into the rolling history.
   *  Returns the history as a Uint8Array ready for texture upload,
   *  ordered from newest (index 0) to oldest (index N-1). */
  updateHistory(): Uint8Array {
    if (!this.analyser || !this._isActive) {
      return new Uint8Array(this.historySize);
    }

    this.analyser.getByteFrequencyData(this.freqData);

    // RMS level — emphasizes peaks for more reactive response
    let sumSq = 0;
    for (let i = 0; i < this.freqData.length; i++) {
      const v = this.freqData[i] / 255;
      sumSq += v * v;
    }
    const level = Math.sqrt(sumSq / this.freqData.length);

    // Low band: bins 0-8 (~0-700Hz)
    let lowSumSq = 0;
    for (let i = 0; i <= 8; i++) {
      const v = this.freqData[i] / 255;
      lowSumSq += v * v;
    }
    const rawLow = Math.sqrt(lowSumSq / 9);

    // High band: bins 41+ (~5kHz+)
    let highSumSq = 0;
    const highCount = this.freqData.length - 41;
    for (let i = 41; i < this.freqData.length; i++) {
      const v = this.freqData[i] / 255;
      highSumSq += v * v;
    }
    const rawHigh = Math.sqrt(highSumSq / highCount);

    // Auto-gain: track peaks, decay slowly so normalization adapts
    this.peakLevel = Math.max(this.peakLevel * this.PEAK_DECAY, level, 0.01);
    this.peakLow = Math.max(this.peakLow * this.PEAK_DECAY, rawLow, 0.01);
    this.peakHigh = Math.max(this.peakHigh * this.PEAK_DECAY, rawHigh, 0.01);

    // Normalize to recent peak so loud moments reach 1.0
    this._level = Math.min(1, level / this.peakLevel);
    this._low = Math.min(1, rawLow / this.peakLow);
    this._high = Math.min(1, rawHigh / this.peakHigh);

    // BPM: onset detection via low-band energy spikes
    this.energyHistory.push(this._low);
    if (this.energyHistory.length > this.ENERGY_HISTORY_SIZE) {
      this.energyHistory.shift();
    }
    if (this.energyHistory.length >= 10) {
      const avg = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
      this.energyThreshold = avg * 1.4 + 0.05;
      const now = performance.now();
      if (this._low > this.energyThreshold && now - this.lastBeatTime > this.BEAT_COOLDOWN) {
        this.lastBeatTime = now;
        this.beatTimestamps.push(now);
        // Prune old beats
        while (this.beatTimestamps.length > 0 && now - this.beatTimestamps[0] > this.BPM_WINDOW) {
          this.beatTimestamps.shift();
        }
        // Compute BPM from median interval
        if (this.beatTimestamps.length >= 3) {
          const intervals: number[] = [];
          for (let i = 1; i < this.beatTimestamps.length; i++) {
            intervals.push(this.beatTimestamps[i] - this.beatTimestamps[i - 1]);
          }
          intervals.sort((a, b) => a - b);
          const median = intervals[Math.floor(intervals.length / 2)];
          const bpm = 60000 / median;
          // Clamp to reasonable range
          if (bpm >= 50 && bpm <= 220) {
            this._bpm = Math.round(bpm);
          }
        }
      }
    }

    const delta = Math.max(0, level - this.prevLevel);
    this.prevLevel = level;

    // Envelope: rise fast, decay slowly so arrows stay big longer
    const incoming = Math.min(1, delta * 8);
    const prev =
      this.history[
        (this.historyHead - 1 + this.historySize) % this.historySize
      ];
    const decayed = prev * 0.92;
    const value = Math.max(incoming, decayed);

    // Push into ring buffer
    this.history[this.historyHead] = value;
    this.historyHead = (this.historyHead + 1) % this.historySize;

    // Build output: newest first so index 0 = path start
    const out = new Uint8Array(this.historySize);
    for (let i = 0; i < this.historySize; i++) {
      const idx =
        (this.historyHead - 1 - i + this.historySize) % this.historySize;
      out[i] = Math.floor(this.history[idx] * 255);
    }
    return out;
  }

  destroy() {
    this.source?.disconnect();
    this.context?.close();
    this._isActive = false;
  }
}
