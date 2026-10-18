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
      <div className="mt-3 rounded-[16px] bg-surface shadow-card p-3 flex items-center gap-3 anim-fade">
        <span className="glyph w-9 h-9 rounded-[10px] bg-accent">
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </span>
        <p className="flex-1 min-w-0 text-[14px] font-semibold tracking-[-0.014em] text-label leading-snug">
          {resolvedTitle}
        </p>
        <button
          type="button"
          onClick={handleReplay}
          className="pressable btn-tinted h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.25} />
          <span>Tekrar Göster</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-[16px] bg-black relative shadow-card">
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

