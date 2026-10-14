import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
  makeCacheableSignalKeyStore,
  proto,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import path from "path";
import fs from "fs";
import { handleIncomingWhatsAppMessage } from "./whatsappService";

export type WhatsAppConnStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

export interface WhatsAppLiveState {
  status: WhatsAppConnStatus;
  qrCodeDataUrl: string | null;
  qrRaw: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastConnectedAt: string | null;
  errorMessage: string | null;
}

let sock: WASocket | null = null;
let state: WhatsAppLiveState = {
  status: "disconnected",
  qrCodeDataUrl: null,
  qrRaw: null,
  connectedPhone: null,
  connectedName: null,
  lastConnectedAt: null,
  errorMessage: null,
};

const AUTH_DIR = path.resolve(process.cwd(), ".whatsapp_session");

const logger = pino({ level: "silent" });

const botSentMessageIds = new Set<string>();
let connectionOpenTime = 0;

// In-memory message store to serve retry requests via getMessage (fixes "Waiting for this message")
const messageStore = new Map<string, proto.IMessage>();
const MAX_MESSAGE_STORE = 1500;

export function storeMessage(id: string | null | undefined, message: proto.IMessage | null | undefined) {
  if (!id || !message) return;
  if (messageStore.size >= MAX_MESSAGE_STORE) {
    const oldestKey = messageStore.keys().next().value;
    if (oldestKey) messageStore.delete(oldestKey);
  }
  messageStore.set(id, message);
}

function extractMessageText(msg: any): string {
  if (!msg?.message) return "";
  const m = msg.message;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.ephemeralMessage?.message?.conversation ||
    m.ephemeralMessage?.message?.extendedTextMessage?.text ||
    m.viewOnceMessage?.message?.conversation ||
    m.viewOnceMessage?.message?.extendedTextMessage?.text ||
    ""
  );
}

/**
 * Format any input phone number to a valid WhatsApp JID (e.g. 60128821099@s.whatsapp.net)
 */
export function formatPhoneToJid(phone: string): string {
  if (phone.includes("@s.whatsapp.net")) {
    return phone;
  }
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // If starts with Malaysian local 01..., replace with 601...
  if (cleaned.startsWith("01")) {
    cleaned = "60" + cleaned.slice(1);
  } else if (cleaned.startsWith("0")) {
    cleaned = "60" + cleaned.slice(1);
  }

  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Start or resume WhatsApp Baileys Multi-Device Socket
 */
// Optional: caller can pass a hint for which customer account is connecting.
// When provided, that account's phone will be updated on successful QR link.
let _pendingCustomerAccountId: number | null = null;

// The customer account ID that is actively linked to the current WhatsApp session.
// This is set when the QR successfully connects and persists until disconnect.
let _activeCustomerAccountId: number | null = null;

export function setActiveCustomerAccountId(id: number | null) {
  _pendingCustomerAccountId = id;
}

export async function startWhatsAppBaileys(customerAccountId?: number): Promise<void> {
  if (customerAccountId != null) _pendingCustomerAccountId = customerAccountId;
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  try {
    state.status = "connecting";
    state.errorMessage = null;

    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: {
        creds: authState.creds,
        keys: makeCacheableSignalKeyStore(authState.keys, logger),
      },
      logger,
      printQRInTerminal: false, // We render the QR visually in the UI
      generateHighQualityLinkPreview: false,
      browser: ["Properly Real Estate", "Chrome", "1.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      // Resolves "Waiting for this message. This may take a while." by returning the message protobuf for retry requests
      getMessage: async (key: proto.IMessageKey) => {
        if (key?.id && messageStore.has(key.id)) {
          return messageStore.get(key.id);
        }
        return proto.Message.fromObject({});
      },
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        state.status = "qr_ready";
        state.qrRaw = qr;
        try {
          state.qrCodeDataUrl = await QRCode.toDataURL(qr, {
            margin: 2,
            width: 320,
            color: {
              dark: "#0F172A",
              light: "#FFFFFF",
            },
          });
        } catch (err: any) {
          console.error("[Baileys] Error generating QR data URL:", err);
        }
      }

      if (connection === "open") {
        connectionOpenTime = Date.now();
        const jid = sock?.user?.id || "";
        const cleanNumber = jid.split(":")[0].split("@")[0];

        state.status = "connected";
        state.qrCodeDataUrl = null;
        state.qrRaw = null;
        state.connectedPhone = cleanNumber ? `+${cleanNumber}` : "Connected Device";
        state.connectedName = sock?.user?.name || "Properly Concierge";
        state.lastConnectedAt = new Date().toISOString();
        state.errorMessage = null;

        console.log(`[Baileys] ✅ Real WhatsApp Connected successfully as ${state.connectedPhone}`);

        // Sync connected phone to the matching customer account in DB.
        // Priority: 1) caller-provided customerAccountId hint, 2) lookup by phone, 3) fallback to account #1
        if (cleanNumber) {
          import("./db-feature").then(async ({ updateCustomerAccountPhone, findCustomerAccountByPhone }) => {
            try {
              let resolvedId: number = _pendingCustomerAccountId ?? 1;

              // Try to find the customer account whose phone matches the connected number
              if (_pendingCustomerAccountId == null) {
                const matchedAccount = await findCustomerAccountByPhone(state.connectedPhone!);
                if (matchedAccount) {
                  resolvedId = matchedAccount.id;
                  console.log(`[Baileys] 🔍 Auto-matched connected phone to customer #${resolvedId} (${matchedAccount.name})`);
                } else {
                  console.log(`[Baileys] ⚠️ No customer account matched phone ${state.connectedPhone}, defaulting to account #1`);
                }
              }

              await updateCustomerAccountPhone(resolvedId, state.connectedPhone!);
              console.log(`[Baileys] 📱 Synced customer #${resolvedId} phone to ${state.connectedPhone}`);
              // Persist the resolved account ID for the duration of this session
              _activeCustomerAccountId = resolvedId;
              _pendingCustomerAccountId = null;

              // Automatically sync prior web chat history directly to the connected phone
              try {
                await syncHistoryToConnectedPhone(resolvedId, 8);
              } catch (e) {
                console.error("[Baileys] Error auto-syncing web chat history to phone:", e);
              }
            } catch (e) {
              console.error("[Baileys] Error updating customer account phone:", e);
              _pendingCustomerAccountId = null;
            }
          }).catch(console.error);
        }
      }

      if (connection === "close") {
        connectionOpenTime = 0;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`[Baileys] Connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          state.status = "disconnected";
          state.qrCodeDataUrl = null;
          state.connectedPhone = null;
          state.connectedName = null;
          state.errorMessage = "Logged out from phone.";
          sock = null;
          _activeCustomerAccountId = null;
          _pendingCustomerAccountId = null;
          // Clear session files
          if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          }
        } else {
          state.status = "connecting";
          // Attempt reconnect after 3 seconds
          setTimeout(() => {
            startWhatsAppBaileys().catch((e) => {
              console.error("[Baileys] Auto-reconnect failed:", e);
            });
          }, 3000);
        }
      }
    });

    // Listen for incoming real messages
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      // Always store all incoming messages into messageStore to serve Signal retry requests
      for (const msg of messages) {
        if (msg?.key?.id && msg?.message) {
          storeMessage(msg.key.id, msg.message);
        }
      }

      if (type !== "notify") return;

      for (const msg of messages) {
        // Skip messages sent by our own bot/server
        if (msg.key.id && botSentMessageIds.has(msg.key.id)) continue;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) continue;
        // Skip all group chats, broadcast lists, and status updates
        if (remoteJid.includes("@g.us") || remoteJid.includes("@broadcast") || remoteJid === "status@broadcast") continue;

        // Skip historical catch-up sync messages (messages timestamped before this connection opened)
        const msgTimestampMs = (typeof msg.messageTimestamp === "number" ? msg.messageTimestamp : Number(msg.messageTimestamp || 0)) * 1000;
        if (msgTimestampMs && connectionOpenTime && msgTimestampMs < connectionOpenTime - 5000) {
          continue;
        }

        const text = extractMessageText(msg);
        if (!text || !text.trim()) continue;

        // Self-echo / bot loop prevention: Ignore messages that start with bot signatures or web sync signatures
        if (
          text.startsWith("🏛️ *PROPERLY") ||
          text.startsWith("❌ *TOUR CANCELLED") ||
          text.startsWith("📅 *TOUR RESCHEDULED") ||
          text.startsWith("🔔 *SPECIALIST ALERT") ||
          text.startsWith("🔄 *SPECIALIST ALERT") ||
          text.startsWith("💬 *[Web Chat]*") ||
          text.startsWith("👤 *You (Web):*") ||
          text.startsWith("🏛️ *Properly Concierge:*") ||
          text.startsWith("━━━━━━━━━━━━━━━━━━━━━━━━━━")
        ) {
          continue;
        }

        const userObj = sock?.user as any;
        const ownCleanNumber = userObj?.id ? String(userObj.id).split(":")[0].split("@")[0].replace(/\D/g, "") : "";
        const ownJid = ownCleanNumber ? `${ownCleanNumber}@s.whatsapp.net` : "";
        const ownCleanLid = userObj?.lid ? String(userObj.lid).split(":")[0].split("@")[0] : "";
        const ownLid = ownCleanLid ? `${ownCleanLid}@lid` : null;

        // STRICT ISOLATION GUARD:
        // ONLY accept messages from the exact single chat of the linked number (i.e. "Message yourself" / Note-to-Self).
        // Under NO circumstances should any message from/to other contacts or chats be touched or replied to!
        const remoteCleanNumber = remoteJid.split(":")[0].split("@")[0].replace(/\D/g, "");
        const isExactOwnNumber = Boolean(ownCleanNumber && remoteCleanNumber === ownCleanNumber);
        const isExactOwnLid = Boolean(ownCleanLid && (remoteJid === ownLid || remoteJid.split(":")[0].split("@")[0] === ownCleanLid));
        const isLinkedNumberChat = isExactOwnNumber || isExactOwnLid || (Boolean(ownJid) && remoteJid === ownJid);

        if (!isLinkedNumberChat) {
          // This belongs to a different personal chat with another person/contact. Ignore completely!
          continue;
        }

        const senderPhone = state.connectedPhone || `+${ownCleanNumber}`;
        const senderName = state.connectedName || msg.pushName || "VIP Client";

        console.log(`[Baileys] 📩 Received Real WhatsApp from single linked chat ${senderPhone} (${senderName}): "${text}"`);

        try {
          const result = await handleIncomingWhatsAppMessage({
            from: senderPhone,
            body: text.trim(),
            senderName,
            messageSid: msg.key.id || `live_${Date.now()}`,
            // Pass the linked customer account ID so messages are always stored
            // against the right buyer even when two accounts share the same phone
            customerAccountIdHint: _activeCustomerAccountId ?? undefined,
          });

          // Send real reply back strictly to the active conversation thread as a quoted reply
          if (result.replyMessage && sock) {
            const targetJid = remoteJid || ownJid;
            const sent = await sock.sendMessage(
              targetJid,
              { text: result.replyMessage },
              { quoted: msg }
            );
            if (sent?.key?.id) {
              botSentMessageIds.add(sent.key.id);
              if (sent.message) storeMessage(sent.key.id, sent.message);
            }
            console.log(`[Baileys] 📤 Sent Real WhatsApp Reply (Quoted) strictly to single linked chat (${targetJid})`);

            // Automatically dispatch .ics calendar attachment if viewing was booked, rescheduled, or calendar was requested
            if (
              (result.action === "viewing_booked" ||
                result.action === "viewing_rescheduled" ||
                result.details?.icsContent) &&
              result.viewing
            ) {
              try {
                const { generateViewingIcs } = await import("./whatsappService");
                const icsContent =
                  result.details?.icsContent ||
                  generateViewingIcs(
                    result.viewing,
                    result.customer?.name || senderName,
                    result.customer?.email
                  );
                const cleanTitle = result.viewing.propertyTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 28);
                const cleanDate = result.viewing.date.replace(/[^a-zA-Z0-9_-]/g, "_");
                const fileName = `VIP_Tour_${cleanTitle}_${cleanDate}.ics`;

                const docSent = await sock.sendMessage(targetJid, {
                  document: Buffer.from(icsContent, "utf-8"),
                  mimetype: "text/calendar",
                  fileName,
                  caption: `📅 *1-Tap Calendar Invite (.ics)*\nTap to add *${result.viewing.propertyTitle}* private tour to your Apple, Google, or Outlook Calendar.`,
                });
                if (docSent?.key?.id) {
                  botSentMessageIds.add(docSent.key.id);
                  if (docSent.message) storeMessage(docSent.key.id, docSent.message);
                }
                console.log(`[Baileys] 📅 Auto-dispatched live .ics calendar attachment (${fileName})`);
              } catch (icsErr) {
                console.warn("[Baileys] Error dispatching live ICS attachment:", icsErr);
              }
            }
          }
        } catch (err: any) {
          console.error("[Baileys] Error handling incoming live message:", err);
        }
      }
    });
  } catch (err: any) {
    console.error("[Baileys] Error starting WhatsApp socket:", err);
    state.status = "disconnected";
    state.errorMessage = err.message || "Failed to initialize WhatsApp socket";
  }
}

/**
 * Send a live outgoing message.
 * STRICT SINGLE-CHAT ISOLATION ENFORCEMENT:
 * Outgoing live WhatsApp messages and push notifications are STRICTLY LOCKED to the single phone number
 * that was connected via QR code (the user's own "Message yourself" / Note-to-Self chat).
 * Under NO circumstances will any message or push notification ever be delivered to any other contact or chat.
 */
export async function sendLiveWhatsAppMessage(
  _phone: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (state.status !== "connected" || !sock) {
    return { success: false, error: "WhatsApp device is not connected. Scan QR code first." };
  }

  try {
    const userObj = sock?.user as any;
    const ownCleanNumber = userObj?.id ? String(userObj.id).split(":")[0].split("@")[0].replace(/\D/g, "") : "";
    if (!ownCleanNumber) {
      return { success: false, error: "No connected device number found." };
    }

    // STRICT DESTINATION: Only the connected user's single own chat ("Message yourself") can receive notifications!
    const singleAllowedJid = `${ownCleanNumber}@s.whatsapp.net`;
    const sent = await sock.sendMessage(singleAllowedJid, { text });
    if (sent?.key?.id) {
      botSentMessageIds.add(sent.key.id);
      if (sent.message) storeMessage(sent.key.id, sent.message);
    }
    console.log(`[Baileys] 🚀 Outbound live notification delivered strictly to connected number's single chat (${singleAllowedJid})`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Baileys] ❌ Failed to send live message to connected phone:`, err);
    return { success: false, error: err.message || "Failed to deliver message" };
  }
}

/**
 * Send a live .ics calendar invite document to the connected WhatsApp device.
 */
export async function sendViewingCalendarInvite(
  viewing: {
    id: number;
    propertyTitle: string;
    propertyLocation: string;
    propertyPrice?: number;
    agentName: string;
    agentPhone: string;
    date: string;
    timeSlot: string;
    notes?: string | null;
  },
  customer?: {
    name?: string;
    email?: string;
  } | null
): Promise<{ success: boolean; error?: string }> {
  if (state.status !== "connected" || !sock) {
    return { success: false, error: "WhatsApp device is not connected." };
  }

  try {
    const userObj = sock?.user as any;
    const ownCleanNumber = userObj?.id ? String(userObj.id).split(":")[0].split("@")[0].replace(/\D/g, "") : "";
    if (!ownCleanNumber) {
      return { success: false, error: "No connected device number found." };
    }

    const { generateViewingIcs } = await import("./whatsappService");
    const icsContent = generateViewingIcs(viewing, customer?.name || "VIP Client", customer?.email || "client@properly.my");

    const cleanTitle = viewing.propertyTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 28);
    const cleanDate = viewing.date.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `VIP_Tour_${cleanTitle}_${cleanDate}.ics`;

    const singleAllowedJid = `${ownCleanNumber}@s.whatsapp.net`;
    const sent = await sock.sendMessage(singleAllowedJid, {
      document: Buffer.from(icsContent, "utf-8"),
      mimetype: "text/calendar",
      fileName,
      caption: `📅 *1-Tap Calendar Invite (.ics)*\nTap to add *${viewing.propertyTitle}* private tour to your Apple, Google, or Outlook Calendar.`,
    });

    if (sent?.key?.id) {
      botSentMessageIds.add(sent.key.id);
      if (sent.message) storeMessage(sent.key.id, sent.message);
    }

    console.log(`[Baileys] 📅 Dispatched .ics calendar attachment (${fileName}) to (${singleAllowedJid})`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Baileys] ❌ Failed to send .ics calendar document:`, err);
    return { success: false, error: err.message || "Failed to deliver calendar document" };
  }
}

/**
 * Get current live connection state
 */
export function getWhatsAppLiveState(): WhatsAppLiveState {
  return { ...state };
}

/**
 * Sync recent web chat conversation history directly to the connected phone
 */
export async function syncHistoryToConnectedPhone(
  customerAccountId: number = 1,
  limit: number = 8
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  if (state.status !== "connected" || !sock) {
    return { success: false, syncedCount: 0, error: "WhatsApp device is not connected." };
  }

  const userObj = sock?.user as any;
  const ownCleanNumber = userObj?.id ? String(userObj.id).split(":")[0].split("@")[0].replace(/\D/g, "") : "";
  if (!ownCleanNumber) {
    return { success: false, syncedCount: 0, error: "No connected device number found." };
  }
  const ownJid = `${ownCleanNumber}@s.whatsapp.net`;

  try {
    const { getWhatsAppMessages } = await import("./db-feature");
    const rawMessages = await getWhatsAppMessages({ customerAccountId, limit });

    // Sort oldest to newest
    const messages = [...rawMessages].reverse();

    if (messages.length === 0) {
      const welcome = [
        `🏛️ *PROPERLY CONCIERGE • WEB SYNC READY*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Your web portal is now linked to this WhatsApp chat!`,
        ``,
        `• Anything you type on the website will be sent here in real-time.`,
        `• You can also reply directly in this chat anytime (*STATUS*, *CANCEL*, *RESCHEDULE*).`,
      ].join("\n");
      const sent = await sock.sendMessage(ownJid, { text: welcome });
      if (sent?.key?.id) {
        botSentMessageIds.add(sent.key.id);
        if (sent.message) storeMessage(sent.key.id, sent.message);
      }
      return { success: true, syncedCount: 0 };
    }

    // Send a header message
    const headerText = [
      `🏛️ *PROPERLY CONCIERGE • SESSION SYNCED*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Your web portal conversation is now linked to this WhatsApp chat! Here is your recent session history:`,
    ].join("\n");

    const headerSent = await sock.sendMessage(ownJid, { text: headerText });
    if (headerSent?.key?.id) {
      botSentMessageIds.add(headerSent.key.id);
      if (headerSent.message) storeMessage(headerSent.key.id, headerSent.message);
    }

    // Forward recent messages to phone
    let count = 0;
    for (const msg of messages) {
      const isUser = msg.direction === "incoming";
      const prefix = isUser ? `👤 *You (Web):*` : `🏛️ *Properly Concierge:*`;
      const textToDeliver = `${prefix}\n${msg.message}`;

      const sentMsg = await sock.sendMessage(ownJid, { text: textToDeliver });
      if (sentMsg?.key?.id) {
        botSentMessageIds.add(sentMsg.key.id);
        if (sentMsg.message) storeMessage(sentMsg.key.id, sentMsg.message);
      }
      count++;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    const readyText = [
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *Sync Complete!* You can now seamlessly continue chatting right here from WhatsApp.`,
    ].join("\n");
    const readySent = await sock.sendMessage(ownJid, { text: readyText });
    if (readySent?.key?.id) {
      botSentMessageIds.add(readySent.key.id);
      if (readySent.message) storeMessage(readySent.key.id, readySent.message);
    }

    console.log(`[Baileys] 📲 Successfully synced ${count} messages to connected WhatsApp (${ownJid})`);
    return { success: true, syncedCount: count };
  } catch (err: any) {
    console.error("[Baileys] Error syncing history to phone:", err);
    return { success: false, syncedCount: 0, error: err.message };
  }
}

/**
 * Disconnect and remove credentials
 */
export async function disconnectWhatsAppSession(): Promise<void> {
  if (sock) {
    try {
      await sock.logout();
    } catch {
      sock.end(undefined);
    }
    sock = null;
  }

  state = {
    status: "disconnected",
    qrCodeDataUrl: null,
    qrRaw: null,
    connectedPhone: null,
    connectedName: null,
    lastConnectedAt: null,
    errorMessage: null,
  };
  _activeCustomerAccountId = null;
  _pendingCustomerAccountId = null;

  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
}
