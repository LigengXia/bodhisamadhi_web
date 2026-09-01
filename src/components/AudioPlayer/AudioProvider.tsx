'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { MiniPlayer } from './MiniPlayer';

export type AudioTrack = {
  id: string;
  slug: string;
  title: string;
  teacher: string;
  durationHint: number | null;
};

type Status = 'idle' | 'loading' | 'ready' | 'error';

type AudioContextValue = {
  track: AudioTrack | null;
  activated: boolean;
  status: Status;
  playing: boolean;
  currentTime: number;
  duration: number;
  /** Load a track's audio without playing it (called when the detail page mounts). */
  prepare: (track: AudioTrack) => void;
  /** Play/pause the current track. Must be called from a user gesture. */
  toggle: () => void;
  seek: (seconds: number) => void;
  /** Stop playback and dismiss the mini-player. */
  stop: () => void;
  isCurrent: (id: string) => boolean;
};

const AudioContext = createContext<AudioContextValue | null>(null);

const REFRESH_BEFORE_MS = 14 * 60 * 1000; // signed URLs live 15 min (Docs/5 §14)

async function fetchSignedUrl(id: string): Promise<string> {
  const res = await fetch(`/api/media/${id}/url`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`media url ${res.status}`);
  return ((await res.json()) as { url: string }).url;
}

// Docs/4 §3.22 · Docs/7 §5.6. One <audio> element lives here, above the routed
// content, so playback survives navigation. It never autoplays — `toggle()` is
// only ever called from a click. Mounted once, in the public layout.
export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlFetchedAtRef = useRef(0);
  const resumeAfterRefreshRef = useRef(false);

  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [activated, setActivated] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadUrl = useCallback(async (id: string, autoplay: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    setStatus('loading');
    try {
      const url = await fetchSignedUrl(id);
      const resumeAt = audio.currentTime;
      audio.src = url;
      urlFetchedAtRef.current = Date.now();
      if (resumeAt > 0) {
        audio.currentTime = resumeAt;
      }
      setStatus('ready');
      if (autoplay) {
        resumeAfterRefreshRef.current = false;
        void audio.play().catch(() => setStatus('error'));
      }
    } catch {
      setStatus('error');
    }
  }, []);

  const prepare = useCallback(
    (next: AudioTrack) => {
      if (track?.id === next.id) return;
      setTrack(next);
      setCurrentTime(0);
      setDuration(next.durationHint ?? 0);
      void loadUrl(next.id, false);
    },
    [track?.id, loadUrl],
  );

  const ensureFreshUrl = useCallback(() => {
    if (Date.now() - urlFetchedAtRef.current > REFRESH_BEFORE_MS && track) {
      resumeAfterRefreshRef.current = true;
      void loadUrl(track.id, true);
      return false;
    }
    return true;
  }, [track, loadUrl]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    setActivated(true);
    if (audio.paused) {
      if (!ensureFreshUrl()) return;
      void audio.play().catch(() => setStatus('error'));
    } else {
      audio.pause();
    }
  }, [track, ensureFreshUrl]);

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (!ensureFreshUrl()) return;
      audio.currentTime = seconds;
      setCurrentTime(seconds);
    },
    [ensureFreshUrl],
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setTrack(null);
    setActivated(false);
    setStatus('idle');
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const isCurrent = useCallback((id: string) => track?.id === id, [track?.id]);

  // Recover from an expired URL mid-listen: refetch once, then surface an error
  // only if the retry also fails (Docs/7 §5.6).
  const onError = useCallback(() => {
    if (!track) return;
    if (!resumeAfterRefreshRef.current) {
      resumeAfterRefreshRef.current = true;
      void loadUrl(track.id, playing);
    } else {
      setStatus('error');
    }
  }, [track, playing, loadUrl]);

  const value = useMemo<AudioContextValue>(
    () => ({
      track,
      activated,
      status,
      playing,
      currentTime,
      duration,
      prepare,
      toggle,
      seek,
      stop,
      isCurrent,
    }),
    [
      track,
      activated,
      status,
      playing,
      currentTime,
      duration,
      prepare,
      toggle,
      seek,
      stop,
      isCurrent,
    ],
  );

  return (
    <AudioContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onError={onError}
      />
      <MiniPlayer />
    </AudioContext.Provider>
  );
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error('useAudio must be used within <AudioProvider>');
  }
  return ctx;
}
