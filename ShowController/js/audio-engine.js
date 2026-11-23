let activeAudio = null;

function fadeAudio(audioEl, targetVol, durationMs, onDone) {
  if (audioEl._fadeTimer) clearInterval(audioEl._fadeTimer);
  if (!durationMs || durationMs <= 0) {
    audioEl.volume = targetVol;
    if (onDone) onDone();
    return;
  }
  const steps = 25;
  const stepTime = durationMs / steps;
  const volStep = (targetVol - audioEl.volume) / steps;

  audioEl._fadeTimer = setInterval(() => {
    const nextVol = audioEl.volume + volStep;
    if ((volStep > 0 && nextVol >= targetVol) || (volStep < 0 && nextVol <= targetVol)) {
      audioEl.volume = targetVol;
      clearInterval(audioEl._fadeTimer);
      if (onDone) onDone();
    } else {
      audioEl.volume = Math.max(0, Math.min(1, nextVol));
    }
  }, stepTime);
}

export function stopAudio(useFadeOut = true, fadeMs = 1500) {
  if (!activeAudio) return;
  const old = activeAudio;
  activeAudio = null;
  if (useFadeOut && !old.paused) {
    fadeAudio(old, 0, fadeMs, () => { old.pause(); old.remove(); });
  } else {
    if (old._fadeTimer) clearInterval(old._fadeTimer);
    old.pause();
    old.remove();
  }
}

export function playAudioCue(cue, prefs = { fadeIn: true, fadeOut: true, fadeMs: 1500 }, onEnded = null) {
  const ms = prefs.fadeMs ?? 1500;
  stopAudio(prefs.fadeOut, ms);
  const mediaUrl = cue.src.startsWith('blob:')
    ? cue.src
    : '/Media/' + cue.src.split('/').map(encodeURIComponent).join('/');

  const audio = document.createElement('audio');
  audio.src = mediaUrl;
  audio.volume = prefs.fadeIn && ms > 0 ? 0 : 1;
  audio.onended = () => {
    if (activeAudio === audio) activeAudio = null;
    audio.remove();
    if (onEnded) onEnded();
  };
  document.body.appendChild(audio);
  audio.play().catch(err => console.warn('Audio playback blocked:', err));
  activeAudio = audio;
  if (prefs.fadeIn) fadeAudio(audio, 1, ms);
}
