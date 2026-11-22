import { Category, DetectedObject } from '@/types';
import { infer, jpeg, loadImage, Usage } from './replicate';

type Detection = { category: Category; label: string; confidence: number | null; bbox: [number, number, number, number] };

type DetectionResponse = { detections: Detection[] } & (
  { source: 'replicate'; usage: Usage } | { source: 'mock'; usage?: never }
);

export async function prepareRoomImage(url: string) {
  const source = await loadImage(url);
  return jpeg(source, 0, 0, source.naturalWidth, source.naturalHeight, 1280, 1_000_000 + 'data:image/jpeg;base64,'.length);
}

export async function segmentRoomImage(image: Awaited<ReturnType<typeof prepareRoomImage>>) {
  const result = await infer<DetectionResponse>('detect', image.url);
  if (result.source !== 'replicate' && result.source !== 'mock') throw new Error('Неизвестный источник распознавания.');
  const percent = (value: number, size: number) => Math.max(0, Math.min(100, 100 * value / size));
  const objects: DetectedObject[] = result.detections.flatMap(({ bbox: [x1, y1, x2, y2], ...item }) => {
    const x = percent(x1, image.width);
    const y = percent(y1, image.height);
    const width = percent(x2, image.width) - x;
    const height = percent(y2, image.height) - y;
    if (width <= 0 || height <= 0) return [];
    return [{ ...item, id: crypto.randomUUID(), bbox: { x, y, width, height } }];
  });
  return { objects, source: result.source, usage: result.usage };
}
