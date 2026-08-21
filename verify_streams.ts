import { validateSingleStreamUrl, isBlacklistedDemoMedia, BLACKLISTED_DEMO_PATTERNS } from '../server/mediaValidator';

async function runAudit() {
  console.log("=== NOVASTREAM MEDIA AUDIT: TEARS OF STEEL & CATALOGUE VERIFICATION ===");
  
  const testStreams = [
    { title: "Tears of Steel (Transcoded H.264/AAC 480p FastStart Local Stream)", url: "/api/media/stream/tears_of_steel_480p.mp4" },
    { title: "Generic Demo (oceans.mp4)", url: "https://vjs.zencdn.net/v/oceans.mp4" },
    { title: "Generic Demo (flower.mp4)", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
    { title: "Generic Demo (friday.mp4)", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4" }
  ];

  for (const item of testStreams) {
    console.log(`\nChecking: ${item.title}`);
    console.log(`URL: ${item.url}`);
    const blacklist = isBlacklistedDemoMedia(item.url);
    if (blacklist.blacklisted) {
      console.log(`❌ BLACKLISTED: ${blacklist.reason}`);
      continue;
    }

    const res = await validateSingleStreamUrl(item.url);
    console.log(`Result OK: ${res.ok}`);
    console.log(`HTTP Status: ${res.httpStatusCode}`);
    console.log(`MIME Type: ${res.mimeType}`);
    console.log(`Accept-Ranges: ${res.acceptRanges}`);
    console.log(`Can Seek: ${res.canSeek}`);
    console.log(`Duration: ${res.durationSeconds}s`);
    console.log(`Video Codec: ${res.videoCodec}`);
    console.log(`Audio Codec: ${res.audioCodec}`);
    if (res.errorMessage) console.log(`Error: ${res.errorMessage}`);
  }
}

runAudit();

