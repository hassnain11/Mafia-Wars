// Preprocess character JPGs: strip the baked-in white/checker background
// into alpha channel at load time. Each image is processed once and cached.
// Falls back to the raw URL if canvas isn't available.

const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

export function processImage(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);
  const pending = inFlight.get(url);
  if (pending) return pending;

  const p = loadAndProcess(url)
    .then((dataUrl) => {
      cache.set(url, dataUrl);
      inFlight.delete(url);
      return dataUrl;
    })
    .catch(() => {
      inFlight.delete(url);
      cache.set(url, url);
      return url;
    });
  inFlight.set(url, p);
  return p;
}

function loadAndProcess(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no 2d context'));
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i]!;
          const g = px[i + 1]!;
          const b = px[i + 2]!;
          // Any pixel that is near-white OR a neutral grey (checker colour)
          // becomes transparent. Character art uses saturated colours and
          // deep tones so this is safe.
          const avg = (r + g + b) / 3;
          const chromatic = Math.max(r, g, b) - Math.min(r, g, b);
          if (avg > 215 && chromatic < 20) {
            px[i + 3] = 0;
          } else if (avg > 235) {
            // very bright even if slightly colored
            px[i + 3] = 0;
          } else if (avg > 200 && chromatic < 10) {
            // soft greys of the checker
            px[i + 3] = 0;
          }
        }
        ctx.putImageData(data, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e as Error);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}
