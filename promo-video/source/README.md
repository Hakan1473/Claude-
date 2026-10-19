# Tanıtım videosu kaynakları

Sesli tanıtım videosunu (`../canli-sesli-tercuman-sesli-tanitim.mp4`) yeniden üretmek için gereken dosyalar.

- `promo3.html`: 1920×1080 kompozisyon; `render(t)` saniye cinsinden gerçek zamanı çizer.
- `lines.json`: seslendirilen repliklerin listesi (id, konuşmacı, metin).
- Ses dosyaları `lines/<id>.wav` (48 kHz mono) olarak beklenir. `lines/kore.wav`, `public/audio/voices/kore.wav` dosyasından üretilir.
- Eğitim videosu kareleri: `ffmpeg -i ../../public/nurse-call-button-guide.mp4 -vf "fps=30,scale=800:450" -q:v 3 vid/%03d.jpg`

Sıra: `python3 build.py` → `node dump.cjs` → `python3 voicetrack.py` → `python3 build.py` → `node dump.cjs` → kareler (`node frames.cjs <worker> <toplam>`) → `python3 audio.py` → ffmpeg ile birleştirme.

Not: Mevcut videodaki sesler çevrimdışı küçük bir modelle üretildi ve kalitesi yetersiz; `lines/` dosyaları Gemini TTS ile yeniden üretilmeli.
