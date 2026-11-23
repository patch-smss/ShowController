const IMG_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const AUD_EXTS = ['mp3', 'wav', 'ogg', 'm4a'];
const VID_EXTS = ['mp4', 'mov', 'webm'];
const PDF_EXTS = ['pdf'];

export function detectMediaKind(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (IMG_EXTS.includes(ext)) return 'image';
  if (AUD_EXTS.includes(ext)) return 'audio';
  if (VID_EXTS.includes(ext)) return 'video';
  if (PDF_EXTS.includes(ext)) return 'pdf';
  return null;
}
