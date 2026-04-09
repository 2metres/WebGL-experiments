/** Listens for MIDI clock messages (0xF8) and derives BPM.
 *  24 clock ticks = 1 quarter note in the MIDI spec. */
export class MidiClock {
  private _bpm = 0;
  private _isActive = false;
  private midiAccess: MIDIAccess | null = null;
  private tickTimestamps: number[] = [];
  private readonly TICKS_PER_BEAT = 24;
  private readonly WINDOW_SIZE = 96; // 4 beats of history

  get bpm() { return this._bpm; }
  get isActive() { return this._isActive; }

  async start(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API not supported");
      return false;
    }
    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.bindInputs();
      // Re-bind when devices change
      this.midiAccess.onstatechange = () => this.bindInputs();
      this._isActive = true;
      return true;
    } catch (e) {
      console.warn("MIDI access denied:", e);
      return false;
    }
  }

  private bindInputs() {
    if (!this.midiAccess) return;
    for (const input of this.midiAccess.inputs.values()) {
      input.onmidimessage = (e) => this.onMessage(e);
    }
  }

  private onMessage(e: MIDIMessageEvent) {
    if (!e.data || e.data.length === 0) return;
    const status = e.data[0];
    // 0xF8 = timing clock
    if (status === 0xF8) {
      this.onTick();
    }
  }

  private onTick() {
    const now = performance.now();
    this.tickTimestamps.push(now);
    if (this.tickTimestamps.length > this.WINDOW_SIZE) {
      this.tickTimestamps.shift();
    }
    // Need at least 2 beats (48 ticks) for a stable reading
    if (this.tickTimestamps.length >= this.TICKS_PER_BEAT * 2) {
      const first = this.tickTimestamps[0];
      const last = this.tickTimestamps[this.tickTimestamps.length - 1];
      const ticks = this.tickTimestamps.length - 1;
      const msPerTick = (last - first) / ticks;
      const msPerBeat = msPerTick * this.TICKS_PER_BEAT;
      this._bpm = Math.round(60000 / msPerBeat);
    }
  }

  destroy() {
    if (this.midiAccess) {
      for (const input of this.midiAccess.inputs.values()) {
        input.onmidimessage = null;
      }
      this.midiAccess.onstatechange = null;
    }
    this._isActive = false;
    this._bpm = 0;
    this.tickTimestamps = [];
  }
}
