import { supabase } from '@/lib/supabase/client';

export const mockEnabled = process.env.NEXT_PUBLIC_INTERIOR_AI_MOCK === 'true';
export const liveEnabled = !mockEnabled && process.env.NEXT_PUBLIC_INTERIOR_AI === 'true' && !!supabase;

export type Usage = { predictionId: string; predictSeconds?: number; totalSeconds?: number };

export async function infer<T>(mode: 'detect' | 'embed', image: string): Promise<T> {
  if (!liveEnabled || !supabase) throw new Error('disabled');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('auth');
  const { data, error } = await supabase.functions.invoke<T>('interior-ai', {
    headers: { Authorization: `Bearer ${session.access_token}` }, body: { mode, image },
  });
  if (error?.context instanceof Response) {
    const payload = await error.context.json().catch(() => null);
    if (typeof payload?.message === 'string') throw new Error(payload.message);
  }
  if (error || !data) throw new Error('Не удалось вызвать функцию распознавания Supabase.');
  return data;
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

export function jpeg(source: HTMLImageElement, x: number, y: number, width: number, height: number, maxSide: number, maxDataUrlLength?: number) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxSide / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, x, y, width, height, 0, 0, canvas.width, canvas.height);
  let url = canvas.toDataURL('image/jpeg', 0.85);
  if (maxDataUrlLength) {
    for (const quality of [0.7, 0.55, 0.4, 0.25]) {
      if (url.length <= maxDataUrlLength) break;
      url = canvas.toDataURL('image/jpeg', quality);
    }
    if (url.length > maxDataUrlLength) throw new Error('JPEG превышает лимит для распознавания.');
  }
  return { url, width: canvas.width, height: canvas.height };
}
