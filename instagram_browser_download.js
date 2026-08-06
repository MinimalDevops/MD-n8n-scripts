#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const puppeteer = require('puppeteer');

const DEBUG_PORT = process.env.INSTAGRAM_BROWSER_DEBUG_PORT || '9223';
const DEBUG_ENDPOINTS = [
  `http://127.0.0.1:${DEBUG_PORT}`,
  `http://localhost:${DEBUG_PORT}`,
];

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const downloadFile = async (url, outputPath, headers) => {
  const response = await fetch(url, { headers, redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Instagram media request failed with HTTP ${response.status}`);
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    output.on('finish', resolve);
    output.on('error', reject);
    Readable.fromWeb(response.body).on('error', reject).pipe(output);
  });
};

const writeMediaChunks = async (groups, outputPath) => {
  const candidates = [...groups.values()]
    .map((group) => {
      const chunks = [...group.chunks.values()].sort((a, b) => a.start - b.start);
      const complete = chunks.length > 0 && chunks[0].start === 0 &&
        chunks.every((chunk, index) => index === 0 || chunk.start === chunks[index - 1].end + 1);
      return { ...group, chunks, complete, size: chunks.reduce((sum, chunk) => sum + chunk.data.length, 0) };
    })
    .filter((group) => group.complete);
  if (!candidates.length) return false;

  // Instagram commonly exposes separate m86 (audio) and m367 (video) tracks.
  // Prefer the smaller complete track because this workflow only needs audio.
  candidates.sort((a, b) => {
    const aAudio = /\/m86\//.test(a.baseUrl) ? 0 : 1;
    const bAudio = /\/m86\//.test(b.baseUrl) ? 0 : 1;
    return aAudio - bAudio || a.size - b.size;
  });
  await fs.promises.writeFile(outputPath, Buffer.concat(candidates[0].chunks.map((chunk) => chunk.data)));
  return true;
};

(async () => {
  const url = process.argv[2];
  const outputPath = process.argv[3];
  if (!url || !outputPath) {
    fail('Usage: node instagram_browser_download.js <URL> <OUTPUT_PATH>');
  }

  let browser;
  let launchedBrowser = false;
  let lastError;
  for (const browserURL of DEBUG_ENDPOINTS) {
    try {
      browser = await puppeteer.connect({ browserURL, defaultViewport: null });
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!browser) {
    try {
      browser = await puppeteer.launch({ headless: true, defaultViewport: null });
      launchedBrowser = true;
    } catch (error) {
      fail(
        `Could not connect to Chrome on port ${DEBUG_PORT} or launch a temporary browser. ` +
        `${error.message || lastError?.message || ''}`
      );
    }
  }

  const page = await browser.newPage();
  let capturedMediaUrl;
  const mediaGroups = new Map();
  const pendingMediaReads = [];
  page.on('response', (response) => {
    const contentType = response.headers()['content-type'] || '';
    const resourceType = response.request().resourceType();
    if (
      resourceType === 'media' ||
      contentType.startsWith('video/') ||
      /\.(mp4|m3u8)(?:[?#]|$)/i.test(response.url())
    ) {
      capturedMediaUrl ||= response.url();
      const responseUrl = response.url();
      const parsedUrl = new URL(responseUrl);
      const start = Number(parsedUrl.searchParams.get('bytestart'));
      const end = Number(parsedUrl.searchParams.get('byteend'));
      if (Number.isInteger(start) && Number.isInteger(end) && end >= start) {
        parsedUrl.searchParams.delete('bytestart');
        parsedUrl.searchParams.delete('byteend');
        const baseUrl = parsedUrl.toString();
        if (!mediaGroups.has(baseUrl)) mediaGroups.set(baseUrl, { baseUrl, chunks: new Map() });
        const group = mediaGroups.get(baseUrl);
        const key = `${start}-${end}`;
        if (!group.chunks.has(key)) {
          const read = response.buffer().then((data) => group.chunks.set(key, { start, end, data }));
          pendingMediaReads.push(read);
        }
      }
    }
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(
      () => document.querySelector('video')?.currentSrc ||
        document.querySelector('meta[property="og:video"]')?.content,
      { timeout: 20000 }
    );
    // Instagram first assigns a blob URL and fetches the actual MP4 shortly
    // afterward. Give the media request time to arrive before falling back.
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await Promise.all(pendingMediaReads);
    const wroteChunks = await writeMediaChunks(mediaGroups, outputPath);
    if (!capturedMediaUrl) {
      capturedMediaUrl = await page.evaluate(() => performance.getEntriesByType('resource')
        .map((entry) => entry.name)
        .find((name) => /\.(mp4|m3u8)(?:[?#]|$)/i.test(name)));
    }

    const media = await page.evaluate(() => ({
      title: document.title || 'instagram',
      url: document.querySelector('video')?.currentSrc ||
        document.querySelector('meta[property="og:video"]')?.content,
    }));
    const mediaUrl = media.url && !media.url.startsWith('blob:') ? media.url : capturedMediaUrl;
    if (!mediaUrl && !wroteChunks) {
      throw new Error('Chrome rendered no downloadable Instagram video URL');
    }

    const cookies = await page.cookies(url);
    const cookieHeader = cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
    if (!wroteChunks) {
      await downloadFile(mediaUrl, outputPath, {
        'User-Agent': await page.evaluate(() => navigator.userAgent),
        Referer: url,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      });
    }

    process.stdout.write(JSON.stringify({ title: media.title, path: outputPath }));
  } finally {
    await page.close();
    if (launchedBrowser) {
      await browser.close();
    } else {
      await browser.disconnect();
    }
  }
})().catch((error) => fail(error.message || String(error)));
