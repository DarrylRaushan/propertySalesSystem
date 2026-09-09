import { mkdir, writeFile } from "node:fs/promises";

const debugPort = process.env.CDP_PORT ?? "9224";
const endpoint = `http://127.0.0.1:${debugPort}/json`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getPage() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const targets = await fetch(endpoint).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {
      // Chromium is still starting.
    }
    await sleep(200);
  }
  throw new Error("Unable to find the mobile Chrome debugging target.");
}

async function main() {
  const page = await getPage();
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let sequence = 0;

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = (expression) => send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  const capture = () => send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: false, screenWidth: 375, screenHeight: 812, scale: 1 });
  await evaluate(`location.href = "http://127.0.0.1:3000/"`);
  await sleep(1200);
  await mkdir("/home/ubuntu/screenshots", { recursive: true });

  const open = async (selector, name) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
    await sleep(250);
    if (!name) return;
    const image = await capture();
    await writeFile(`/home/ubuntu/screenshots/mobile-dashboard-${name}.png`, Buffer.from(image.data, "base64"));
    const report = await evaluate(`(() => {
      const dialog = document.querySelector(".compact-experience-dialog");
      const close = document.querySelector('[aria-label^="Close"]');
      const rect = dialog?.getBoundingClientRect();
      const closeRect = close?.getBoundingClientRect();
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        dialog: rect ? { top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) } : null,
        closeVisible: Boolean(closeRect && closeRect.top >= 0 && closeRect.bottom <= window.innerHeight),
        documentFits: document.documentElement.scrollHeight <= window.innerHeight,
      };
    })()`);
    results[name] = report.result.value;
  };
  const close = async () => {
    await evaluate(`document.querySelector('[aria-label^="Close"]')?.click()`);
    await sleep(180);
  };
  const results = {};

  await open('[aria-label="Open animated sales trend"]', "sales-momentum");
  await close();

  await open('[aria-label="Open animated sales trend"]');
  await evaluate(`Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Performance mix"))?.click()`);
  await sleep(250);
  const performanceImage = await capture();
  await writeFile("/home/ubuntu/screenshots/mobile-dashboard-performance-mix.png", Buffer.from(performanceImage.data, "base64"));
  const performanceReport = await evaluate(`(() => { const dialog = document.querySelector(".compact-experience-dialog"); const close = document.querySelector('[aria-label^="Close"]'); const rect = dialog?.getBoundingClientRect(); const closeRect = close?.getBoundingClientRect(); return { viewport: { width: window.innerWidth, height: window.innerHeight }, dialog: rect ? { top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) } : null, closeVisible: Boolean(closeRect && closeRect.top >= 0 && closeRect.bottom <= window.innerHeight), documentFits: document.documentElement.scrollHeight <= window.innerHeight }; })()`);
  results["performance-mix"] = performanceReport.result.value;
  await close();

  await open('[aria-label="Open animated sales trend"]');
  await evaluate(`Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Revenue vs. commission"))?.click()`);
  await sleep(250);
  const revenueImage = await capture();
  await writeFile("/home/ubuntu/screenshots/mobile-dashboard-revenue-commission.png", Buffer.from(revenueImage.data, "base64"));
  const revenueReport = await evaluate(`(() => { const dialog = document.querySelector(".compact-experience-dialog"); const close = document.querySelector('[aria-label^="Close"]'); const rect = dialog?.getBoundingClientRect(); const closeRect = close?.getBoundingClientRect(); return { viewport: { width: window.innerWidth, height: window.innerHeight }, dialog: rect ? { top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) } : null, closeVisible: Boolean(closeRect && closeRect.top >= 0 && closeRect.bottom <= window.innerHeight), documentFits: document.documentElement.scrollHeight <= window.innerHeight }; })()`);
  results["revenue-commission"] = revenueReport.result.value;
  await close();

  await open('[aria-label="Open Pipeline health"]', "pipeline-health");
  await close();

  await open('[aria-label="Open interactive Source mix"]', "source-mix");
  await close();

  socket.close();
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
