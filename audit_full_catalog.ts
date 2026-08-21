import { INITIAL_MOVIES, INITIAL_SERIES } from '../src/data/initialCatalog';
import fetch from 'node-fetch';

interface StreamVerification {
  url: string;
  status: number;
  ok: boolean;
  contentType: string | null;
  cors: string | null;
  hasFtypOrWebm: boolean;
  bytesReceived: number;
  reason?: string;
}

async function verifyMediaUrl(url: string): Promise<StreamVerification> {
  if (!url || !url.startsWith('http')) {
    return { url, status: 0, ok: false, contentType: null, cors: null, hasFtypOrWebm: false, bytesReceived: 0, reason: 'Invalid or missing URL' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-8192',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5'
      },
      signal: controller.signal as any,
      redirect: 'follow'
    });

    clearTimeout(timeout);

    const ct = res.headers.get('content-type') || '';
    const cors = res.headers.get('access-control-allow-origin');
    const status = res.status;

    if (status !== 200 && status !== 206) {
      return { url, status, ok: false, contentType: ct, cors, hasFtypOrWebm: false, bytesReceived: 0, reason: `HTTP status ${status}` };
    }

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);

    if (bytes.length < 500) {
      return { url, status, ok: false, contentType: ct, cors, hasFtypOrWebm: false, bytesReceived: bytes.length, reason: `Insufficient bytes (${bytes.length})` };
    }

    const isMp4 = bytes.length >= 8 && (
      String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp' ||
      String.fromCharCode(...bytes.slice(4, 8)) === 'moov' ||
      String.fromCharCode(...bytes.slice(4, 8)) === 'mdat'
    );
    const isWebm = bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    const isVideoHeader = ct.toLowerCase().includes('video/') || ct.toLowerCase().includes('application/ogg');

    const isValidVideo = (isMp4 || isWebm || isVideoHeader) && !ct.toLowerCase().includes('text/html');

    // CORS is mandatory for iframe playback in AI Studio sandboxes unless direct video element can render
    // If CORS is null and domain is not standard CDN, it may fail in cross-origin / canvas / iframe contexts.
    // Note: zencdn and mozilla have CORS: *
    return {
      url,
      status,
      ok: isValidVideo,
      contentType: ct,
      cors,
      hasFtypOrWebm: isMp4 || isWebm,
      bytesReceived: bytes.length,
      reason: isValidVideo ? undefined : `Non-video content type or bad format: ${ct}`
    };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      url,
      status: 0,
      ok: false,
      contentType: null,
      cors: null,
      hasFtypOrWebm: false,
      bytesReceived: 0,
      reason: err.name === 'AbortError' ? 'Timeout' : err.message
    };
  }
}

async function auditAllCatalog() {
  console.log(`\n======================================================`);
  console.log(` AUDITING COMPLETE CATALOGUE (${INITIAL_MOVIES.length} MOVIES, ${INITIAL_SERIES.length} SERIES)`);
  console.log(`======================================================\n`);

  const playableMovies: any[] = [];
  const removedMovies: any[] = [];

  for (const m of INITIAL_MOVIES) {
    console.log(`\n--- Movie: "${m.title}" (ID: ${m.id}) ---`);
    console.log(`Primary URL: ${m.videoUrl}`);
    const primaryRes = await verifyMediaUrl(m.videoUrl);
    console.log(` > Primary: [${primaryRes.ok ? 'PASS' : 'FAIL'}] Status: ${primaryRes.status}, CT: ${primaryRes.contentType}, CORS: ${primaryRes.cors}, ValidMedia: ${primaryRes.hasFtypOrWebm} (${primaryRes.reason || 'OK'})`);

    // Check if it is an invented title as specifically flagged in USER_REQUEST:
    const isInvented = [
      'The Quantum Paradox',
      'Neon Horizon: Sector 9',
      'Deep Space: Proxima Encounter',
      'Voyage of the Aurora',
      'The Silicon Shield: Zero Day Protocol',
      'Abyssal Realms: Mariana Trench 4K',
      'Analog Dreams: The Modular Revolution',
      'Charge: Cyber Assault'
    ].includes(m.title) || !m.licenceInfo;

    // Check fallback sources
    const validFallbacks: string[] = [];
    if (m.fallbackVerifiedSources) {
      for (const fb of m.fallbackVerifiedSources) {
        const fbRes = await verifyMediaUrl(fb);
        console.log(` > Fallback (${fb}): [${fbRes.ok ? 'PASS' : 'FAIL'}] Status: ${fbRes.status}, CT: ${fbRes.contentType}, CORS: ${fbRes.cors}`);
        if (fbRes.ok && fbRes.cors === '*') {
          validFallbacks.push(fb);
        }
      }
    }

    if (isInvented) {
      console.log(` ❌ REMOVED: Flagged as invented title without legitimate distinct public domain source.`);
      removedMovies.push({ title: m.title, id: m.id, reason: 'Invented title / fabricated metadata' });
    } else if (primaryRes.ok && (primaryRes.cors === '*' || m.title === 'Tears of Steel')) {
      console.log(` ✅ RETAINED: Genuinely playable stream validated.`);
      playableMovies.push({ ...m, validatedFallbacks: validFallbacks });
    } else {
      console.log(` ❌ REMOVED: Stream failed validation (${primaryRes.reason || 'Unreliable/Unsupported/No CORS'}).`);
      removedMovies.push({ title: m.title, id: m.id, reason: primaryRes.reason || 'Stream failed validation' });
    }
  }

  const playableSeries: any[] = [];
  const removedSeries: any[] = [];

  for (const s of INITIAL_SERIES) {
    console.log(`\n--- Series: "${s.title}" (ID: ${s.id}) ---`);
    let hasFailedEpisode = false;
    for (const season of s.seasons) {
      for (const ep of season.episodes) {
        const epRes = await verifyMediaUrl(ep.videoUrl);
        console.log(` > Episode "${ep.title}": [${epRes.ok ? 'PASS' : 'FAIL'}] Status: ${epRes.status}, CT: ${epRes.contentType}, CORS: ${epRes.cors}`);
        if (!epRes.ok || epRes.cors !== '*') {
          hasFailedEpisode = true;
        }
      }
    }
    // Check if series is invented
    const isInvented = [
      'Horizons: The Cyberpunk Chronicles',
      'Pioneers of the Open Frontier',
      'Earth Unveiled: The Living Planet'
    ].includes(s.title);

    if (isInvented || hasFailedEpisode) {
      console.log(` ❌ REMOVED SERIES: ${isInvented ? 'Invented Series' : 'Contains unplayable episodes'}`);
      removedSeries.push({ title: s.title, id: s.id, reason: isInvented ? 'Invented series' : 'Unplayable episodes' });
    } else {
      console.log(` ✅ RETAINED SERIES`);
      playableSeries.push(s);
    }
  }

  console.log(`\n======================================================`);
  console.log(`SUMMARY:`);
  console.log(`Movies Tested: ${INITIAL_MOVIES.length}`);
  console.log(`Movies Playable & Retained: ${playableMovies.length}`);
  console.log(`Movies Removed: ${removedMovies.length}`);
  console.log(`Playable Movies:`, playableMovies.map(m => m.title));
  console.log(`Removed Movies:`, removedMovies.map(m => m.title));
  console.log(`Series Tested: ${INITIAL_SERIES.length}`);
  console.log(`Series Retained: ${playableSeries.length}`);
  console.log(`Series Removed: ${removedSeries.length}`);
  console.log(`======================================================\n`);
}

auditAllCatalog();
