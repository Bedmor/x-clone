"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export function CustomVideoPlayer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            const video = videoRef.current;
            if (video && !video.paused) {
              video.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.2 }, // Pause when less than 20% of the video is visible
    );

    const currentContainer = containerRef.current;
    if (currentContainer) {
      observer.observe(currentContainer);
    }

    return () => {
      if (currentContainer) {
        observer.unobserve(currentContainer);
      }
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play();
      setIsPlaying(true);
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(duration)) return;

    const nextTime = (value / 100) * duration;
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const toggleFullscreen = async () => {
    const videoContainer = videoRef.current?.parentElement;
    if (!videoContainer) return;

    if (!document.fullscreenElement) {
      await videoContainer.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  };

  return (
    <div
      ref={containerRef}
      className={`group relative bg-black ${className ?? ""}`}
    >
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-cover"
        playsInline
        onClick={() => void togglePlay()}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration || 0)
        }
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime || 0)
        }
      />

      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100" />

      <button
        type="button"
        onClick={() => void togglePlay()}
        className="absolute top-3 left-3 rounded-full border border-white/30 bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80"
        aria-label={isPlaying ? "Videoyu duraklat" : "Videoyu oynat"}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <div className="absolute right-3 bottom-3 left-3 rounded-xl border border-white/20 bg-black/65 p-2.5 text-white backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-white/85">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(event) => handleSeek(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer accent-blue-500"
          aria-label="Video ilerleme çubuğu"
        />

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleMute}
            className="rounded-full p-1.5 text-white/90 transition hover:bg-white/15"
            aria-label={isMuted ? "Sesi aç" : "Sesi kapat"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="rounded-full p-1.5 text-white/90 transition hover:bg-white/15"
            aria-label={isFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
