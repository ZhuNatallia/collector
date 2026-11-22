import { demoObjects } from './mock-data';
import { DetectedObject } from '@/types';

/** Mock-first adapter. Replace the demo branch with Replicate/Fal.ai SAM or YOLO. */
export async function segmentRoomImage(imageUrl: string): Promise<DetectedObject[]> {
  if (!process.env.NEXT_PUBLIC_SEGMENTATION_ENDPOINT) return demoObjects;
  const response = await fetch(process.env.NEXT_PUBLIC_SEGMENTATION_ENDPOINT, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({imageUrl}),
  });
  if (!response.ok) throw new Error('Не удалось проанализировать изображение');
  return response.json();
}
