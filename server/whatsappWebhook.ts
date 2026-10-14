import { Request, Response, Router } from "express";
import { handleIncomingWhatsAppMessage, IncomingWhatsAppPayload } from "./whatsappService";

export const whatsappWebhookRouter = Router();

/**
 * GET /api/whatsapp/webhook
 * Verification endpoint for Meta WhatsApp Cloud API
 */
whatsappWebhookRouter.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Verify against configured verify token or default
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "properly_whatsapp_verify_token";

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[WhatsApp Webhook] Verification successful");
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }

  return res.json({
    status: "active",
    message: "Properly WhatsApp Webhook Receiver is running.",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/whatsapp/webhook
 * Handles incoming WhatsApp webhook events (Supports Twilio & Meta Cloud API)
 */
whatsappWebhookRouter.post("/webhook", async (req: Request, res: Response) => {
  try {
    let payload: IncomingWhatsAppPayload | null = null;

    // 1. Twilio WhatsApp webhook format (x-www-form-urlencoded or JSON)
    if (req.body?.From && req.body?.Body) {
      payload = {
        from: req.body.From,
        body: req.body.Body,
        senderName: req.body.ProfileName || req.body.senderName,
        messageSid: req.body.MessageSid || req.body.SmsMessageSid,
      };
    }
    // 2. Meta WhatsApp Cloud API format
    else if (req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = req.body.entry[0].changes[0].value.messages[0];
      const contact = req.body.entry[0].changes[0].value.contacts?.[0];
      if (msg.type === "text" && msg.text?.body) {
        payload = {
          from: msg.from,
          body: msg.text.body,
          senderName: contact?.profile?.name,
          messageSid: msg.id,
        };
      }
    }
    // 3. Custom direct format: { from, body, senderName }
    else if (req.body?.from && req.body?.body) {
      payload = {
        from: req.body.from,
        body: req.body.body,
        senderName: req.body.senderName,
        messageSid: req.body.messageSid,
      };
    }

    if (!payload) {
      return res.status(400).json({
        error: "Unrecognized WhatsApp payload format. Expected { from, body } or standard Twilio/Meta payload.",
      });
    }

    console.log(`[WhatsApp Webhook] Received from ${payload.from}: "${payload.body}"`);

    const result = await handleIncomingWhatsAppMessage(payload);

    // Return TwiML if requested or standard JSON
    if (req.headers["user-agent"]?.includes("Twilio")) {
      res.setHeader("Content-Type", "text/xml");
      return res.send(
        `<Response><Message>${result.replyMessage}</Message></Response>`
      );
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[WhatsApp Webhook] Error processing incoming message:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * POST /api/whatsapp/simulate
 * Fast direct simulation endpoint for testing
 */
whatsappWebhookRouter.post("/simulate", async (req: Request, res: Response) => {
  try {
    const { from, body, senderName } = req.body;
    if (!from || !body) {
      return res.status(400).json({ error: "Missing required fields: from and body" });
    }

    const result = await handleIncomingWhatsAppMessage({
      from,
      body,
      senderName,
      messageSid: `sim_${Date.now()}`,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[WhatsApp Simulator] Error:", error);
    return res.status(500).json({ error: error.message });
  }
});
