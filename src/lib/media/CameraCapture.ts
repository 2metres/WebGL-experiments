export class CameraCapture {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private _isActive = false;

  get isActive() {
    return this._isActive;
  }

  get videoElement(): HTMLVideoElement | null {
    return this.video;
  }

  async start(existingStream?: MediaStream): Promise<boolean> {
    try {
      this.stream = existingStream ?? await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      this.video = document.createElement("video");
      this.video.srcObject = this.stream;
      this.video.autoplay = true;
      this.video.playsInline = true;
      this.video.muted = true;
      await this.video.play();
      this._isActive = true;
      return true;
    } catch (e) {
      console.warn("Camera access denied or unavailable:", e);
      return false;
    }
  }

  get ready(): boolean {
    return (
      this._isActive &&
      this.video !== null &&
      this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    );
  }

  destroy() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this._isActive = false;
  }
}
