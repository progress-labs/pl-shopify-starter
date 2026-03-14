class VideoPlayer extends window.HTMLElement {
  constructor() {
    super()

    this.video = this.querySelector('video')
    this.playBtn = this.querySelector('[data-play]')
    this.muteBtn = this.querySelector('[data-mute]')

    if (!this.video) return

    // Set initial state based on video properties
    this.dataset.state = this.video.paused ? 'paused' : 'playing'
    this.dataset.muted = this.video.muted

    // Video event listeners
    this._onPlay = () => (this.dataset.state = 'playing')
    this._onPause = () => (this.dataset.state = 'paused')
    this._onVolumeChange = () => (this.dataset.muted = this.video.muted)

    this.video.addEventListener('play', this._onPlay)
    this.video.addEventListener('pause', this._onPause)
    this.video.addEventListener('volumechange', this._onVolumeChange)

    // Button click handlers
    if (this.playBtn) {
      this._onPlayClick = () => {
        this.video.paused ? this.video.play() : this.video.pause()
      }
      this.playBtn.addEventListener('click', this._onPlayClick)
    }

    if (this.muteBtn) {
      this._onMuteClick = () => {
        this.video.muted = !this.video.muted
      }
      this.muteBtn.addEventListener('click', this._onMuteClick)
    }

    // Keyboard support
    this._onKeyDown = (e) => {
      if (e.target.closest('input, textarea, select')) return

      if (e.code === 'Space') {
        e.preventDefault()
        this.video.paused ? this.video.play() : this.video.pause()
      } else if (e.code === 'KeyM') {
        this.video.muted = !this.video.muted
      }
    }
    this.addEventListener('keydown', this._onKeyDown)
  }

  disconnectedCallback() {
    if (!this.video) return

    this.video.removeEventListener('play', this._onPlay)
    this.video.removeEventListener('pause', this._onPause)
    this.video.removeEventListener('volumechange', this._onVolumeChange)

    if (this.playBtn) {
      this.playBtn.removeEventListener('click', this._onPlayClick)
    }
    if (this.muteBtn) {
      this.muteBtn.removeEventListener('click', this._onMuteClick)
    }
    this.removeEventListener('keydown', this._onKeyDown)
  }
}

window.customElements.define('video-player', VideoPlayer)
