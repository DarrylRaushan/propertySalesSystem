import { writeFile } from "node:fs/promises";

const debugPort = process.env.CDP_PORT ?? "9223";
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

  await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true, screenWidth: 375, screenHeight: 812 });
  await sleep(250);
  await evaluate(`new Promise((resolve) => {
    const tick = () => document.querySelector('[role="listitem"]') ? resolve(true) : setTimeout(tick, 100);
    tick();
  })`);
  await evaluate(`document.querySelector('[role="listitem"]').click()`);
  await sleep(300);
  await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('3D concept'))?.click()`);
  await sleep(850);

  const inspection = await evaluate(`(() => {
    const root = document.querySelector('#root');
    const shell = document.querySelector('.property-dossier-shell');
    const actions = document.querySelector('.property-detail-actions');
    const viewer = document.querySelector('.property-dossier-viewer');
    const rect = (element) => element ? ({ top: Math.round(element.getBoundingClientRect().top), bottom: Math.round(element.getBoundingClientRect().bottom), height: Math.round(element.getBoundingClientRect().height) }) : null;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      pageHeight: document.documentElement.scrollHeight,
      root: rect(root),
      dossier: rect(shell),
      viewer: rect(viewer),
      actions: rect(actions),
      fitsViewport: document.documentElement.scrollHeight <= window.innerHeight,
      visibleActions: Boolean(actions && actions.getBoundingClientRect().bottom <= window.innerHeight),
    };
  })()`);

  const screenshot = await capture();
  await writeFile("/home/ubuntu/screenshots/mobile-dossier-375x812.png", Buffer.from(screenshot.data, "base64"));
  socket.close();
  console.log(JSON.stringify(inspection.result.value, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
