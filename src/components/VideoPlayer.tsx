'use client'
import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  poster?: string
  title?: string
  description?: string
  className?: string
}

export default function VideoPlayer({ 
  src, 
  poster, 
  title = "KalaMitra Craftsmanship", 
  description = "Experience the beauty of traditional craftsmanship",
  className = ""
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const time = parseFloat(e.target.value)
    video.currentTime = time
    setCurrentTime(time)
  }

  const handleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (video.requestFullscreen) {
      video.requestFullscreen()
    }
  }

  const handleRestart = () => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = 0
    setCurrentTime(0)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`relative group ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        poster={poster}
        preload="metadata"
        playsInline
        loop
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Custom Controls Overlay */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top Overlay */}
        <div className="absolute top-4 left-4 right-4 bg-gradient-to-b from-black/60 to-transparent rounded-t-2xl p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-[var(--heritage-gold)] rounded-full"></div>
              <span className="text-sm font-medium">{title}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1 h-1 bg-white/60 rounded-full"></div>
              <div className="w-1 h-1 bg-white/60 rounded-full"></div>
              <div className="w-1 h-1 bg-white/60 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-glow hover:scale-110 transition-transform duration-300"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-[var(--heritage-gold)]" />
            ) : (
              <Play className="w-8 h-8 text-[var(--heritage-gold)] ml-1" />
            )}
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg p-3">
          {/* Progress Bar */}
          <div className="mb-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePlay}
                className="hover:text-[var(--heritage-gold)] transition-colors duration-200"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="hover:text-[var(--heritage-gold)] transition-colors duration-200"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={handleRestart}
                className="hover:text-[var(--heritage-gold)] transition-colors duration-200"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <span className="text-xs text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-white/80 hidden sm:block">{description}</span>
              <button
                onClick={handleFullscreen}
                className="hover:text-[var(--heritage-gold)] transition-colors duration-200"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Traditional Pattern Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-4 left-4 w-16 h-16 border-2 border-[var(--heritage-gold)] rounded-full"></div>
        <div className="absolute top-4 right-4 w-12 h-12 border-2 border-[var(--heritage-red)] rounded-full"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 border-2 border-[var(--heritage-green)] rounded-full"></div>
        <div className="absolute bottom-4 right-4 w-16 h-16 border-2 border-[var(--heritage-blue)] rounded-full"></div>
      </div>
    </div>
  )
}
