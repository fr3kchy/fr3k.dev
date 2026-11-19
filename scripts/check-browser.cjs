// Run against the local preview with Playwright on NODE_PATH.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const paths = [...readFileSync(resolve(__dirname, "../sitemap.xml"), "utf8").matchAll(/<loc>https:\/\/fr3k\.dev([^<]+)<\/loc>/g)].map(match => match[1]);
const base = "http://127.0.0.1:8765";
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH});
  try {
    for (const [width,height] of [[320,720], [390,844], [768,1024], [1440,900]]) {
      const page = await browser.newPage({viewport: {width,height}, reducedMotion:"reduce", serviceWorkers:"block"});
      const errors = [];
      const videos = [];
      page.on("pageerror", error => errors.push(page.url() + " " + error.message));
      page.on("request", request => { if (request.url().endsWith(".mp4")) videos.push(request.url()); });
      // Exercise the deployed-snapshot fallback and keep this check offline.
      await page.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      for (const path of paths) {
        const res = await page.goto(base + path, {waitUntil:"load"});
        assert.equal(res.status(), 200, path);
        // Avoid testing pre-font / pre-layout transients in headless CI.
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
        const extra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (extra > 1) {
          const elements = await page.locator("body *").evaluateAll(nodes => nodes.filter(node => node.getBoundingClientRect().right > innerWidth + 1).slice(0,6).map(node => node.tagName + "." + node.className));
          const dims = await page.evaluate(() => ({
            root: document.documentElement.scrollWidth, body: document.body.scrollWidth,
            client: document.documentElement.clientWidth,
            suspects: [...document.querySelectorAll("body *")]
              .filter(el => el.scrollWidth > el.clientWidth + 1)
              .slice(0, 10)
              .map(el => ({
                node: el.tagName + "." + String(el.className).slice(0,40),
                scroll: el.scrollWidth, client: el.clientWidth,
                text: (el.textContent || "").trim().slice(0,50)
              })),
            nav: [...document.querySelectorAll(".lab-nav,.lab-bar,.lab-links")].map(el => ({
              name: el.className,
              right: Math.round(el.getBoundingClientRect().right), scroll: el.scrollWidth
            }))
          }));
          errors.push(path + " overflows " + extra + "px at " + width + " (" + elements.join(", ") + ") " + JSON.stringify(dims));
        }
        if (path === "/") {
          assert.deepEqual(videos, [], "Home fetched a video on entry");
          assert.equal(await page.locator(".lab-skip").evaluate(el => el.getBoundingClientRect().bottom <= 0), true, "Skip to content should be hidden until focus");
          await page.keyboard.press("Tab");
          assert.equal(await page.locator(":focus").textContent(), "Skip to content");
        }
        if (path === "/films/") {
          assert.equal(await page.locator(".film-card").count(), 17, "17 original film players required");
          await page.locator('[data-filter="fleet"]').click();
          assert.equal(await page.locator(".film-card:visible").count(), 4, "Fleet film filter must work");
          await page.locator('[data-filter="all"]').click();
          assert.equal(await page.locator(".film-card:visible").count(), 17, "All films must restore");
        }
        if (path === "/forge/") {
          await page.locator("#field-example img").evaluate(img => img.decode());
          assert.equal(await page.locator("#field-example img").evaluate(img => img.naturalWidth),512);
        }
        if (["/blackwave/campaign/", "/blackwave/social/"].includes(path)) {
          assert.equal(await page.locator(".nav__links").isVisible(), true, path + " must have reachable navigation");
        }
        if (path === "/projects/") {
          await page.waitForSelector(".flagship-progress");
          assert.equal(await page.locator("[data-flagship-card]").count(),17);
        }
        if (process.env.SCREENSHOT_DIR && ["/","/forge/","/invest/","/operations/"].includes(path)) {
          if (path === "/forge/") await page.locator("#field-example").scrollIntoViewIfNeeded();
          await page.screenshot({path: resolve(process.env.SCREENSHOT_DIR, (path.split("/")[1] || "home") + "-" + width + ".png")});
        }
      }
      assert.deepEqual(errors, []);
      console.log(width + "×" + height + " · " + paths.length + " local routes checked");
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode=1;});
