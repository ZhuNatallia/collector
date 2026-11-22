import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// adirik/grounding-dino: https://replicate.com/adirik/grounding-dino/api
const versions = {
  detect: 'efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa',
  embed: '75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a',
};
const categories = {
  sofa: 'Диваны', armchair: 'Кресла', table: 'Столы', lamp: 'Светильники',
  rug: 'Ковры', cushion: 'Текстиль', vase: 'Декор', chair: 'Стулья',
} as const;
const bucket = 'interior-ai-inputs';
const maxBody = 2_800_000;
const maxImageBytes = 2 * 1024 * 1024;
const maxRoomBytes = 750_000;
const jpegFrames = new Set([0xc0, 0xc1, 0xc2]);

// Read dimensions from the JPEG frame header before forwarding untrusted input.
function jpegSize(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
      bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return;
  for (let offset = 2; offset + 3 < bytes.length;) {
    if (bytes[offset++] !== 0xff) return;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) return;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return;
    if (jpegFrames.has(marker) && length >= 11) {
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      if (width > 0 && height > 0) return { width, height };
      return;
    }
    offset += length;
  }
}

type Prediction = {
  id: string;
  status: string;
  output?: unknown;
  metrics?: { predict_time?: number; total_time?: number };
};

async function predict(token: string, mode: keyof typeof versions, input: object) {
  const endpoint = 'https://api.replicate.com/v1/predictions';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const deadline = Date.now() + 110_000;
  const signal = () => AbortSignal.timeout(Math.max(1, deadline - Date.now()));
  const response = await fetch(endpoint, {
    method: 'POST', headers: { ...headers, Prefer: 'wait=20', 'Cancel-After': '110s' },
    body: JSON.stringify({ version: versions[mode], input }), signal: signal(),
  });
  if (!response.ok) throw new Error(`Replicate create: ${response.status}`);
  let result: Prediction = await response.json();
  const id = result.id;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid prediction ID');
  while (result.status === 'starting' || result.status === 'processing') {
    if (Date.now() >= deadline) throw new Error('Prediction timed out');
    await new Promise(resolve => setTimeout(resolve, 1500));
    const poll = await fetch(`${endpoint}/${id}`, { headers, signal: signal() });
    if (!poll.ok) throw new Error(`Replicate poll: ${poll.status}`);
    result = await poll.json();
  }
  if (result.status !== 'succeeded') throw new Error(`Prediction ${result.status}`);
  return { output: result.output, usage: {
    predictionId: id, predictSeconds: result.metrics?.predict_time,
    totalSeconds: result.metrics?.total_time,
  } };
}

Deno.serve(async request => {
  const origin = request.headers.get('Origin');
  const allowedOrigins = (Deno.env.get('INTERIOR_APP_ORIGINS') ?? '').split(',').map(s => s.trim());
  if (origin && !allowedOrigins.includes(origin)) {
    return Response.json({ error: 'origin', message: 'Этот адрес не разрешён в настройках CORS.' }, { status: 403 });
  }
  const cors = {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  const reply = (body: object, status = 200) => Response.json(body, { status, headers: cors });
  const fail = (status: number, error: string, message: string) => reply({ error, message }, status);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return fail(405, 'method', 'Используйте POST.');

  const jwt = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!jwt) return fail(401, 'auth', 'Войдите в Supabase, чтобы запустить анализ.');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await admin.auth.getUser(jwt);
  if (error || !user) return fail(401, 'auth', 'Войдите в Supabase, чтобы запустить анализ.');
  const allowedUsers = (Deno.env.get('INTERIOR_AI_USER_IDS') ?? '').split(',').map(s => s.trim());
  if (user.is_anonymous || !allowedUsers.includes(user.id)) return fail(403, 'access', 'Ваш пользователь не включён в список доступа к анализу.');

  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return fail(415, 'content_type', 'Передайте тело запроса в формате application/json.');
  }
  let body;
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail(400, 'input', 'Передайте JSON с mode и JPEG в поле image.');
    let length = 0;
    let raw = '';
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBody) {
        await reader.cancel();
        return fail(413, 'size', 'Размер JPEG должен быть не больше 2 МиБ.');
      }
      raw += decoder.decode(value, { stream: true });
    }
    body = JSON.parse(raw + decoder.decode());
  } catch {
    return fail(400, 'input', 'Передайте JSON с mode и JPEG в поле image.');
  }
  const { mode, image } = body ?? {};
  const jpeg = typeof image === 'string' && /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if ((mode !== 'detect' && mode !== 'embed') || !jpeg) {
    return fail(400, 'input', 'Укажите mode detect или embed и передайте JPEG в виде data URL.');
  }
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(jpeg[1]), character => character.charCodeAt(0));
  } catch {
    return fail(400, 'input', 'Поле image содержит некорректный base64.');
  }
  if (bytes.length > maxImageBytes) return fail(413, 'size', 'Размер JPEG должен быть не больше 2 МиБ.');
  if (mode === 'detect' && bytes.length > maxRoomBytes) {
    return fail(413, 'size', 'Размер JPEG комнаты должен быть не больше 750 КБ.');
  }
  const size = jpegSize(bytes);
  if (!size || Math.max(size.width, size.height) > 1280) {
    return fail(400, 'image', 'Передайте JPEG с корректным заголовком и стороной до 1280 пикселей.');
  }

  if (Deno.env.get('INTERIOR_AI_MODE') === 'mock') {
    if (mode !== 'detect') return fail(503, 'mock', 'В серверном демо-режиме доступно только распознавание.');
    return reply({
      source: 'mock',
      detections: [{
        label: 'Демо: диван', category: 'Диваны', confidence: null,
        bbox: [size.width * 0.25, size.height * 0.5, size.width * 0.75, size.height * 0.85],
      }],
    });
  }
  const token = Deno.env.get('REPLICATE_API_TOKEN');
  if (!token) return fail(503, 'disabled', 'В секретах Supabase отсутствует REPLICATE_API_TOKEN.');

  let cropPath: string | undefined;
  try {
    if (mode === 'detect') {
      const { output, usage } = await predict(token, mode, {
        image, query: Object.keys(categories).join(', '),
        box_threshold: 0.25, text_threshold: 0.25, show_visualisation: false,
      });
      const detections = (output as { detections?: unknown })?.detections;
      if (!Array.isArray(detections)) throw new Error('Invalid detections');
      return reply({ source: 'replicate', usage, detections: detections.flatMap(item => {
        const label = typeof item?.label === 'string' ? item.label.trim() : '';
        const key = label.toLowerCase();
        const { bbox, confidence } = item ?? {};
        if (!Object.hasOwn(categories, key) || !Array.isArray(bbox) ||
          bbox.length !== 4 || !bbox.every(Number.isFinite) ||
          bbox[0] >= bbox[2] || bbox[1] >= bbox[3] ||
          !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return [];
        const category = categories[key as keyof typeof categories];
        return [{ category, label, confidence, bbox }];
      }) });
    }

    const path = `${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, bytes, { contentType: 'image/jpeg' });
    if (uploadError) throw new Error('Crop upload failed');
    cropPath = path;
    const { data, error: signError } = await admin.storage.from(bucket).createSignedUrl(path, 180);
    if (signError) throw new Error('Crop URL failed');
    const { output, usage } = await predict(token, mode, { inputs: data.signedUrl });
    const embedding = Array.isArray(output) && output.length === 1 ? output[0]?.embedding : null;
    if (!Array.isArray(embedding) || embedding.length !== 768 ||
      !embedding.every(Number.isFinite) || !embedding.some(value => value !== 0)) {
      throw new Error('Invalid CLIP embedding');
    }
    return reply({ embedding, usage });
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Inference failed');
    return fail(502, 'inference', 'Не удалось получить результат от Replicate. Проверьте журналы функции.');
  } finally {
    if (cropPath) {
      const { error: cleanupError } = await admin.storage.from(bucket).remove([cropPath]);
      if (cleanupError) console.error('Temporary crop cleanup failed');
    }
  }
});
