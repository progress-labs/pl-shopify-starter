class VideoPlayer extends window.HTMLElement {
  video: HTMLVideoElement | null
  playBtn: HTMLElement | null
  muteBtn: HTMLElement | null
  _onPlay?: () => void
  _onPause?: () => void
  _onVolumeChange?: () => void
  _onPlayClick?: () => void
  _onMuteClick?: () => void
  _onKeyDown?: (e: KeyboardEvent) => void

  constructor() {
    super()

    this.video = this.querySelector('video')
    this.playBtn = this.querySelector('[data-play]')
    this.muteBtn = this.querySelector('[data-mute]')

    if (!this.video) return
    const video = this.video

    // Set initial state based on video properties
    this.dataset.state = video.paused ? 'paused' : 'playing'
    this.dataset.muted = String(video.muted)

    // Video event listeners
    this._onPlay = () => (this.dataset.state = 'playing')
    this._onPause = () => (this.dataset.state = 'paused')
    this._onVolumeChange = () => (this.dataset.muted = String(video.muted))

    video.addEventListener('play', this._onPlay)
    video.addEventListener('pause', this._onPause)
    video.addEventListener('volumechange', this._onVolumeChange)

    // Button click handlers
    if (this.playBtn) {
      this._onPlayClick = () => {
        if (video.paused) {
          video.play()
        } else {
          video.pause()
        }
      }
      this.playBtn.addEventListener('click', this._onPlayClick)
    }

    if (this.muteBtn) {
      this._onMuteClick = () => {
        video.muted = !video.muted
      }
      this.muteBtn.addEventListener('click', this._onMuteClick)
    }

    // Keyboard support
    this._onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (video.paused) {
          video.play()
        } else {
          video.pause()
        }
      } else if (e.code === 'KeyM') {
        video.muted = !video.muted
      }
    }
    this.addEventListener('keydown', this._onKeyDown)
  }

  disconnectedCallback() {
    if (!this.video) return

    this.video.removeEventListener('play', this._onPlay!)
    this.video.removeEventListener('pause', this._onPause!)
    this.video.removeEventListener('volumechange', this._onVolumeChange!)

    if (this.playBtn) {
      this.playBtn.removeEventListener('click', this._onPlayClick!)
    }
    if (this.muteBtn) {
      this.muteBtn.removeEventListener('click', this._onMuteClick!)
    }
    this.removeEventListener('keydown', this._onKeyDown!)
  }
}

window.customElements.define('video-player', VideoPlayer)
