// scraper.js
// Usage: node scraper.js <URL> [--quiet|-q]
// Make sure Chrome is running in remote debug mode:
// /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/ChromeDebug"

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// Function to sanitize filename from URL and place it in a tmp folder
const getPdfPathFromUrl = (url) => {
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const urlPath = new URL(url).pathname;
  const baseName = urlPath.split('/').filter(Boolean).pop() || 'output';
  const sanitizedName = baseName.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(tmpDir, `${sanitizedName}.pdf`);
};

(async () => {
  const url = process.argv[2];
  const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');
  if (!url) {
    if (!quiet) console.error('Usage: node scraper.js <URL>');
    process.exit(1);
  }

  const pdfPath = getPdfPathFromUrl(url);

  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9224',
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // Dismiss any native browser dialogs (alerts, confirms)
  page.on('dialog', async dialog => {
    if (!quiet) console.log(`Dismissing dialog: ${dialog.message()}`);
    await dialog.dismiss();
  });

  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector("body");

  // Try to find and remove common cookie banners and pop-ups
  await page.evaluate(() => {
    const selectors = [
      '[id*="cookie"]', '[class*="cookie"]',
      '[id*="banner"]', '[class*="banner"]',
      '[id*="popup"]', '[class*="popup"]',
      '[id*="dialog"]', '[class*="dialog"]',
      '[id*="modal"]', '[class*="modal"]',
      '[aria-modal="true"]'
    ];
    document.querySelectorAll(selectors.join(', ')).forEach(el => el.remove());
  });

  // Click "Read more" or similar buttons to expand content
  await page.evaluate(async () => {
    const selectors = [
      '#description-inline-expander .yt-core-attributed-string__expander-link', // Video description
      '#content-text .more-button', // Community post
      '#expand' // General expand button
    ];
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
        // Wait a moment for the content to expand
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  });

  // Scroll slowly to the bottom to load all content
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300; // Smaller scroll distance
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 500); // Slower interval
    });
  });

  // Clean up the page: keep only the article and remove everything from and after "Written by"
  await page.evaluate(() => {
    let mainArticle = document.querySelector("article") || document.querySelector("section") || document.body;

    // Find the node containing 'Written by'
    const walker = document.createTreeWalker(mainArticle, NodeFilter.SHOW_ELEMENT, null, false);
    let foundNode = null;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.textContent && node.textContent.match(/\bWritten by\b/i)) {
        foundNode = node;
        break;
      }
    }

    if (foundNode) {
      // Walk up to the nearest container block
      let blockContainer = foundNode;
      while (blockContainer && blockContainer !== mainArticle && !blockContainer.classList.contains("cb")) {
        blockContainer = blockContainer.parentElement;
      }

      if (blockContainer && blockContainer !== mainArticle) {
        let current = blockContainer;
        while (current && current !== mainArticle) {
          let sibling = current.nextElementSibling;
          while (sibling) {
            let toRemove = sibling;
            sibling = sibling.nextElementSibling;
            toRemove.remove();
          }
          current = current.parentElement;
        }

        // Remove the container itself
        blockContainer.remove();
      }
    }
  });

  // Save cleaned page as PDF
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });

  await page.close();
  await browser.close();

  // Output the full path to the PDF
  console.log(pdfPath);
})();
