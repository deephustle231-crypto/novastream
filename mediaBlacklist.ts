// Permanent Blacklist of known generic demo / sample / test videos
export const BLACKLISTED_DEMO_PATTERNS: RegExp[] = [
  /oceans\.mp4/i,
  /flower\.mp4/i,
  /friday\.mp4/i,
  /w3c/i,
  /w3schools/i,
  /mdn/i,
  /interactive-examples\.mdn\.mozilla\.net/i,
  /test-videos\.co\.uk/i,
  /jellyfish/i,
  /sintel\/trailer/i,
  /bunny\/movie/i,
  /video\/movie_300/i,
  /vjs\.zencdn\.net/i,
  /Big_Buck_Bunny_1080_10s/i,
  /Sintel_1080_10s/i,
  /Jellyfish_1080_10s/i,
  /sample-mp4-file/i,
  /w3schools\.com\/html\/mov_bbb/i
];

export function isBlacklistedDemoMedia(url: string): { blacklisted: boolean; reason?: string } {
  if (!url || typeof url !== 'string') return { blacklisted: false };
  for (const pattern of BLACKLISTED_DEMO_PATTERNS) {
    if (pattern.test(url)) {
      return {
        blacklisted: true,
        reason: `REJECTED BY SAFETY POLICY: Prohibited generic demo/sample video pattern detected (${pattern.source}). Generic test clips cannot be used as movie media.`
      };
    }
  }
  return { blacklisted: false };
}
