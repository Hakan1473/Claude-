import { useRef, useEffect, useState, type FC } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import {
  NURSE_CALL_VIDEO_URL,
  NURSE_CALL_ALT_VIDEO_URL,
} from '../utils/nurseCallDetection';

interface NurseCallVideoCardProps {
  videoUrl?: string;
  altVideoUrl?: string;
  title?: string;
}

/**
 * Clean, minimalistic Medical Tutorial video container (Nurse Call Button & Triflow Device).
 * Plays the reference guide video completely muted.
 * Automatically stops after 3 loops to save resources, displaying the clean video name
 * and a replay button without exposing loop numbers or internal explanations.
 */
export const NurseCallVideoCard: FC<NurseCallVideoCardProps> = ({
  videoUrl = NURSE_CALL_VIDEO_URL,
  altVideoUrl = NURSE_CALL_ALT_VIDEO_URL,
  title,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setLoopCount] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Compute friendly educational video title
  const resolvedTitle =
    title ||
    (videoUrl.toLowerCase().includes('triflow')
      ? 'Triflow Solunum Egzersiz Cihazı Eğitimi'
      : 'Hemşire Çağrı Butonu Eğitim Videosu');

  useEffect(() => {
    if (isDismissed) return;
    const el = videoRef.current;
    if (el) {
      if (videoUrl && el.src !== videoUrl) {
        el.src = videoUrl;
      }
      el.muted = true;
      el.defaultMuted = true;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          el.muted = true;
          el.play().catch(() => {});
        });
      }
    }
  }, [videoUrl, isDismissed]);

  const handleVideoEnded = () => {
    setLoopCount((prev) => {
      const next = prev + 1;
      // Stop after 3 loop iterations as requested
      if (next >= 3) {
        setIsDismissed(true);
        if (videoRef.current) {
          videoRef.current.pause();
        }
        return next;
      }
      // Replay next loop iteration muted
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
      return next;
    });
  };

  const handleReplay = () => {
    setLoopCount(0);
    setIsDismissed(false);
  };

  if (isDismissed) {
    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-teal-500/25 dark:border-teal-400/20 bg-teal-50/50 dark:bg-slate-900/90 p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              {resolvedTitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReplay}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Eğitimi Tekrar Göster</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm bg-black/95 relative group">
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        onEnded={handleVideoEnded}
        onError={() => {
          if (videoRef.current && altVideoUrl && videoRef.current.src !== altVideoUrl) {
            videoRef.current.src = altVideoUrl;
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        }}
        className="w-full h-auto max-h-[360px] md:max-h-[460px] object-contain block mx-auto pointer-events-none select-none"
      />
    </div>
  );
};

