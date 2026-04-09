export class AudioCapture {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private _isActive = false;
  private prevLevel = 0;
  private _level = 0;

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

  async start(existingStream?: MediaStream): Promise<boolean> {
    try {
      const stream = existingStream ?? await navigator.mediaDevices.getUserMedia({ audio: true });
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;
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

    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) {
      sum += this.freqData[i];
    }
    const level = sum / (this.freqData.length * 255);
    this._level = level;
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
