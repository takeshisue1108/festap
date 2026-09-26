// fetch + decodeAudioData for the active pack (plan §6.1).

/**
 * AAC/MP3 encoders prepend silence (priming, ~20–50 ms) and not every browser trims it.
 * For quantized drums that would be an audible late hit, so decoded buffers start at the first
 * sample above `threshold`, backed off by `keepSec` to keep the attack.
 */
export function trimLeadingSilence(ctx: BaseAudioContext, buf: AudioBuffer, threshold = 0.003, keepSec = 0.001): AudioBuffer {
  let first = buf.length;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < Math.min(first, d.length); i++) {
      if (Math.abs(d[i]) > threshold) {
        first = i;
        break;
      }
    }
  }
  const start = Math.max(0, first - Math.round(keepSec * buf.sampleRate));
  if (start === 0 || first === buf.length) return buf;
  const out = ctx.createBuffer(buf.numberOfChannels, buf.length - start, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(start), c);
  return out;
}

export async function loadBuffer(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const decoded = await ctx.decodeAudioData(await res.arrayBuffer());
  return trimLeadingSilence(ctx, decoded);
}

/** Load a { key: url } map; failures are logged and skipped so a missing file never blocks play. */
export async function loadBufferMap<K extends string | number>(
  ctx: BaseAudioContext,
  urls: Record<K, string>,
  onEach?: () => void,
): Promise<Map<K, AudioBuffer>> {
  const out = new Map<K, AudioBuffer>();
  await Promise.all(
    (Object.entries(urls) as [K, string][]).map(async ([k, url]) => {
      try {
        out.set(k, await loadBuffer(ctx, url));
      } catch (e) {
        console.warn("festap: could not load", url, e);
      } finally {
        onEach?.();
      }
    }),
  );
  return out;
}
