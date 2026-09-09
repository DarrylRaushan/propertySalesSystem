import { writeFile } from "node:fs/promises";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  const targets = await fetch("http://127.0.0.1:9226/json").then((response) => response.json());
  const page = targets.find((target) => target.type === "page");
  if (!page) throw new Error("No headless browser page target is available.");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map(); let id = 0;
  const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params })); });
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", ({ data }) => { const message = JSON.parse(data); const request = pending.get(message.id); if (!request) return; pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); });
  const evaluate = (expression) => send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: false, screenWidth: 375, screenHeight: 812, scale: 1 });
  await send("Page.navigate", { url: "http://127.0.0.1:3000/analytics" });
  await wait(2200);
  await evaluate("window.dispatchEvent(new CustomEvent('toggleAiChat'))");
  await wait(350);
  const metrics = await evaluate(`(() => { const chat = document.querySelector('.ai-terrain-chat'); const box = chat?.getBoundingClientRect(); return { viewport: { width: innerWidth, height: innerHeight }, chat: box ? { top: Math.round(box.top), bottom: Math.round(box.bottom), width: Math.round(box.width), height: Math.round(box.height) } : null, sendVisible: Boolean(chat?.querySelector('button')), inputVisible: Boolean(chat?.querySelector('input')), suggestionCount: chat?.querySelectorAll('.ai-terrain-suggestion').length ?? 0 }; })()`);
  const capture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile("/home/ubuntu/screenshots/mobile-ai-375x812.png", Buffer.from(capture.data, "base64"));
  socket.close();
  console.log(JSON.stringify(metrics.result.value, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
