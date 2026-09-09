import { writeFile } from "node:fs/promises";

const endpoint = "http://127.0.0.1:9225/json";
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getPage() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const pages = await fetch(endpoint).then((response) => response.json());
      const page = pages.find((target) => target.type === "page");
      if (page) return page;
    } catch {
      // Chromium is still starting.
    }
    await wait(200);
  }
  throw new Error("Mobile Chrome target was not available.");
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
  await send("Page.navigate", { url: "http://127.0.0.1:3000/leads" });
  await wait(2200);

  const metrics = await evaluate(`(() => {
    const rect = (selector) => { const element = document.querySelector(selector); if (!element) return null; const box = element.getBoundingClientRect(); return { top: Math.round(box.top), bottom: Math.round(box.bottom), width: Math.round(box.width), height: Math.round(box.height) }; };
    const queue = document.querySelectorAll('.lead-table tbody tr').length;
    return { viewport: { width: window.innerWidth, height: window.innerHeight }, hero: rect('.lead-hero'), kpis: rect('.lead-kpi-grid'), focus: rect('.lead-focus-grid'), toolbar: rect('.lead-toolbar'), queue, resetVisible: Boolean(document.querySelector('[aria-label="Reset filters"]')), createVisible: Boolean(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Create lead'))), documentHeight: document.documentElement.scrollHeight };
  })()`);
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile("/home/ubuntu/screenshots/mobile-leads-375x812.png", Buffer.from(screenshot.data, "base64"));
  socket.close();
  console.log(JSON.stringify(metrics.result.value, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
