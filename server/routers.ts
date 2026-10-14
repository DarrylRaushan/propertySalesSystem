import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as dbFeature from "./db-feature";
import {
  getLLMRuntimeConfig,
  setLLMRuntimeConfig,
  testLLMConnection,
} from "./_core/llm";
import {
  processAiChat,
  generateExecutiveSummary,
  explainBuyerPropertyFit,
} from "./aiChat";
import {
  sendViewingConfirmation,
  handleIncomingWhatsAppMessage,
} from "./whatsappService";


const leadInput = z.object({
  name: z.string().min(1),
  initials: z.string().min(1),
  accent: z.string(),
  location: z.string(),
  segment: z.string(),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
  probability: z.number().min(0).max(100),
  value: z.coerce.number(),
  property: z.string(),
  action: z.string(),
  agentId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
});

const propertyInput = z.object({
  title: z.string().min(1),
  developer: z.string(),
  location: z.string(),
  type: z.string(),
  status: z.string(),
  price: z.coerce.number(),
  beds: z.number().default(0),
  baths: z.number().default(0),
  size: z.string(),
  description: z.string().optional(),
  features: z.any().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

const customerInput = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  segment: z.string(),
  totalPurchased: z.coerce.number().default(0),
  unitsOwned: z.number().default(0),
  isVip: z.boolean().default(false),
  notes: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // Agent login — validated server-side so passwords never reach the browser bundle
    // TODO: migrate to bcrypt hashed passwords stored in the users table
    agentLogin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(({ input }) => {
        // Agent credential store lives server-side only
        const AGENT_PASSWORDS: Record<string, { agentId: string; name: string }> = {
          "hannah@properly.my":    { agentId: "hannah", name: "Hannah Cheong" },
          "amir@properly.my":      { agentId: "amir",   name: "Amir Rahman" },
          "chloe@properly.my":     { agentId: "chloe",  name: "Chloe Tan" },
          "bertbob944@gmail.com":  { agentId: "darryl", name: "Darryl Raushan" },
        };
        const AGENT_PASSWORD_VALUES: Record<string, string> = {
          "hannah@properly.my":   process.env.AGENT_PWD_HANNAH   || "hannah123",
          "amir@properly.my":     process.env.AGENT_PWD_AMIR     || "amir123",
          "chloe@properly.my":    process.env.AGENT_PWD_CHLOE    || "chloe123",
          "bertbob944@gmail.com": process.env.AGENT_PWD_DARRYL   || "darryl123",
        };
        const cleanEmail = input.email.toLowerCase().trim();
        const agent = AGENT_PASSWORDS[cleanEmail];
        if (!agent) return { success: false as const, error: "No agent account found for this email." };
        const expected = AGENT_PASSWORD_VALUES[cleanEmail];
        if (expected && input.password !== expected) {
          return { success: false as const, error: "Incorrect password for agent account." };
        }
        return { success: true as const, agentId: agent.agentId, name: agent.name, email: cleanEmail };
      }),

    // Customer portal login — email + password against customer_accounts table
    // TODO: migrate account.password to bcrypt hash and use bcrypt.compare() here
    loginCheck: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const account = await dbFeature.findCustomerAccountByEmail(input.email);
        if (!account) return { success: false, error: "No account found for this email." };
        if (account.password !== input.password) return { success: false, error: "Incorrect password." };
        return {
          success: true,
          customerId: account.id,
          name: account.name,
          email: account.email,
          phone: account.phone,
          avatarInitials: account.avatarInitials,
          segment: account.segment,
          budget: account.budget,
          preferredLocation: account.preferredLocation,
          preferredTypes: account.preferredTypes,
          minBeds: account.minBeds ?? 0,
          investmentGoal: account.investmentGoal,
          preferredFeatures: account.preferredFeatures,
        };
      }),
  }),

  ai: router({
    chat: publicProcedure
      .input(
        z.object({
          messages: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().trim().min(1).max(32000),
              })
            )
            .min(1)
            .max(30),
          mode: z.enum(["agent", "customer"]).default("agent"),
        })
      )
      .mutation(async ({ input }) => {
        return processAiChat(input.messages, input.mode);
      }),

    getStatus: publicProcedure.query(() => {
      return getLLMRuntimeConfig();
    }),

    updateConfig: publicProcedure
      .input(
        z.object({
          provider: z.enum(["gemini", "openai", "deepseek", "groq", "openrouter", "ollama", "custom", "auto"]).optional(),
          apiKey: z.string().optional(),
          baseUrl: z.string().optional(),
          model: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        setLLMRuntimeConfig(input);
        return getLLMRuntimeConfig();
      }),

    testConnection: publicProcedure
      .input(
        z
          .object({
            provider: z.enum(["gemini", "openai", "deepseek", "groq", "openrouter", "ollama", "custom", "auto"]).optional(),
            apiKey: z.string().optional(),
            baseUrl: z.string().optional(),
            model: z.string().optional(),
          })
          .optional()
      )
      .mutation(async ({ input }) => {
        return testLLMConnection(input);
      }),

    summary: publicProcedure
      .input(
        z.object({
          type: z.enum(["pipeline", "leads", "properties", "custom"]).default("pipeline"),
          prompt: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return generateExecutiveSummary(input.type, input.prompt);
      }),

    explainFit: publicProcedure
      .input(
        z.object({
          buyerName: z.string(),
          buyerKind: z.enum(["Lead", "Customer"]),
          buyerDetail: z.string(),
          buyerScore: z.number(),
          propertyName: z.string(),
          propertyDeveloper: z.string(),
          propertyLocation: z.string(),
          propertyPrice: z.number(),
          propertyType: z.string(),
          propertyBeds: z.number(),
          propertySize: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return explainBuyerPropertyFit(input);
      }),
  }),



  // Dashboard metrics
  dashboard: router({
    metrics: publicProcedure
      .input(z.object({ period: z.string().optional() }).optional())
      .query(({ input }) => dbFeature.getDashboardMetrics(input?.period)),
  }),

  // Leads CRUD
  leads: router({
    list: publicProcedure
      .input(
        z.object({
          priority: z.string().optional(),
          segment: z.string().optional(),
          agentId: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }).optional()
      )
      .query(({ input }) => dbFeature.listLeads(input)),
    byId: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
      dbFeature.getLeadById(input.id)
    ),
    create: publicProcedure.input(leadInput).mutation(({ input }) =>
      dbFeature.createLead(input)
    ),
    update: publicProcedure
      .input(z.object({ id: z.number(), data: leadInput.partial() }))
      .mutation(({ input }) => dbFeature.updateLead(input.id, input.data)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
      dbFeature.deleteLead(input.id)
    ),
  }),

  // Properties CRUD
  properties: router({
    list: publicProcedure
      .input(
        z.object({
          activeOnly: z.boolean().optional(),
          search: z.string().optional(),
        }).optional()
      )
      .query(({ input }) => dbFeature.listProperties(input)),
    byId: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
      dbFeature.getPropertyById(input.id)
    ),
    create: publicProcedure.input(propertyInput).mutation(({ input }) =>
      dbFeature.createProperty(input)
    ),
    update: publicProcedure
      .input(z.object({ id: z.number(), data: propertyInput.partial() }))
      .mutation(({ input }) => dbFeature.updateProperty(input.id, input.data)),
  }),

  // Customers CRUD
  customers: router({
    list: publicProcedure
      .input(z.object({ segment: z.string().optional(), search: z.string().optional() }).optional())
      .query(({ input }) => dbFeature.listCustomers(input)),
    create: publicProcedure.input(customerInput).mutation(({ input }) =>
      dbFeature.createCustomer(input)
    ),
    update: publicProcedure
      .input(z.object({ id: z.number(), data: customerInput.partial() }))
      .mutation(({ input }) => dbFeature.updateCustomer(input.id, input.data)),
  }),

  // Pipeline stages
  pipeline: router({
    list: publicProcedure.input(z.object({ period: z.string().optional() }).optional()).query(({ input }) =>
      dbFeature.listPipelineStages(input?.period)
    ),
  }),

  // Sales trend
  salesTrend: router({
    list: publicProcedure.input(z.object({ year: z.number().optional() }).optional()).query(({ input }) =>
      dbFeature.listSalesTrend(input?.year)
    ),
    byPeriod: publicProcedure.input(z.object({ period: z.string().optional() }).optional()).query(({ input }) =>
      dbFeature.listSalesTrendByPeriod(input?.period)
    ),
  }),

  // Enquiry sources
  enquirySources: router({
    list: publicProcedure.input(z.object({ period: z.string().optional() }).optional()).query(({ input }) =>
      dbFeature.listEnquirySources(input?.period)
    ),
  }),

  // Follow-up health
  followUpHealth: router({
    list: publicProcedure.input(z.object({ period: z.string().optional() }).optional()).query(({ input }) =>
      dbFeature.listFollowUpHealth(input?.period)
    ),
  }),

  // Agent-side viewings — see bookings made by customers in the pipeline
  viewings: router({
    listByAgent: publicProcedure
      .input(z.object({ agentId: z.string(), limit: z.number().optional() }))
      .query(({ input }) => dbFeature.listViewingsByAgent(input.agentId, input.limit ?? 10)),
  }),

  // Customer portal — shortlists & viewings
  customerPortal: router({
    // Shortlist
    getShortlist: publicProcedure
      .input(z.object({ customerAccountId: z.number() }))
      .query(({ input }) => dbFeature.getShortlistByCustomer(input.customerAccountId)),

    toggleShortlist: publicProcedure
      .input(z.object({ customerAccountId: z.number(), propertyId: z.number() }))
      .mutation(({ input }) => dbFeature.toggleShortlist(input.customerAccountId, input.propertyId)),

    // Viewings
    getViewings: publicProcedure
      .input(z.object({ customerAccountId: z.number() }))
      .query(({ input }) => dbFeature.getViewingsByCustomer(input.customerAccountId)),

    bookViewing: publicProcedure
      .input(z.object({
        customerAccountId: z.number(),
        propertyId: z.number(),
        propertyTitle: z.string(),
        propertyLocation: z.string(),
        propertyPrice: z.number(),
        propertyImage: z.string().optional(),
        agentId: z.string(),
        agentName: z.string(),
        agentPhone: z.string(),
        date: z.string(),
        timeSlot: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 1. Strict double-booking validation (Local DB + Google Calendar)
        const { checkSlotAvailability, createGoogleCalendarEvent } = await import("./googleCalendarService");
        const avail = await checkSlotAvailability({
          agentId: input.agentId,
          date: input.date,
          timeSlot: input.timeSlot,
        });

        if (!avail.available) {
          throw new TRPCError({
            code: "CONFLICT",
            message: avail.reason || "This viewing slot is unavailable due to an existing calendar commitment.",
          });
        }

        const viewing = await dbFeature.createViewing({
          ...input,
          status: "Confirmed",
          whatsappNotificationSent: true,
        });

        // 2. Sync event to Agent's Google Calendar via API
        try {
          const customer = await dbFeature.getCustomerAccountById(input.customerAccountId);
          const calResult = await createGoogleCalendarEvent({
            viewing,
            customer: {
              name: customer?.name || "VIP Client",
              email: customer?.email || "darrylraushansingh@gmail.com",
              phone: customer?.phone || input.agentPhone,
            },
          });

          if (calResult.success && calResult.eventId) {
            await dbFeature.updateViewingGoogleCalendar(viewing.id, {
              googleCalendarEventId: calResult.eventId,
              googleCalendarHtmlLink: calResult.htmlLink || null,
            });
            viewing.googleCalendarEventId = calResult.eventId;
            viewing.googleCalendarHtmlLink = calResult.htmlLink || null;
          } else if (!calResult.success) {
            console.warn("[GoogleCalendar] Booking sync notice:", calResult.error);
          }
        } catch (calErr) {
          console.warn("[GoogleCalendar] Booking sync notice:", calErr);
        }

        // 3. Dispatch instant WhatsApp booking confirmation notification & email alerts
        try {
          const customer = await dbFeature.getCustomerAccountById(input.customerAccountId);
          await sendViewingConfirmation(viewing, customer);
          const { notifyViewingBooked } = await import("./emailService");
          await notifyViewingBooked({
            viewing,
            customer: {
              id: customer?.id,
              name: customer?.name || "VIP Client",
              email: customer?.email || "darrylraushansingh@gmail.com",
              phone: customer?.phone || input.agentPhone,
            },
          });
        } catch (err) {
          console.warn("[Booking Notification] Could not dispatch auto-confirmation / email:", err);
        }

        return viewing;
      }),

    // Query real-time availability across slots (Google Calendar + Local Bookings)
    getSlotAvailability: publicProcedure
      .input(
        z.object({
          agentId: z.string(),
          date: z.string(),
          candidateSlots: z.array(z.string()).optional(),
          excludeViewingId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const { getDayAvailability } = await import("./googleCalendarService");
        return getDayAvailability({
          agentId: input.agentId,
          date: input.date,
          candidateSlots: input.candidateSlots,
          excludeViewingId: input.excludeViewingId,
        });
      }),

    // Google Calendar Service Connection Status
    getGoogleCalendarStatus: publicProcedure.query(async () => {
      const { getGoogleCalendarStatus } = await import("./googleCalendarService");
      return getGoogleCalendarStatus();
    }),

    cancelViewing: publicProcedure
      .input(z.object({ id: z.number(), customerAccountId: z.number() }))
      .mutation(async ({ input }) => {
        const oldViewing = await dbFeature.getViewingById(input.id);
        if (oldViewing?.googleCalendarEventId) {
          try {
            const { deleteGoogleCalendarEvent } = await import("./googleCalendarService");
            await deleteGoogleCalendarEvent({
              eventId: oldViewing.googleCalendarEventId,
              agentId: oldViewing.agentId,
            });
          } catch (calErr) {
            console.warn("[GoogleCalendar] Cancellation sync notice:", calErr);
          }
        }
        return dbFeature.cancelViewing(input.id, input.customerAccountId);
      }),

    deleteViewing: publicProcedure
      .input(z.object({ id: z.number(), customerAccountId: z.number() }))
      .mutation(async ({ input }) => {
        return dbFeature.deleteViewing(input.id, input.customerAccountId);
      }),

    rescheduleViewing: publicProcedure
      .input(
        z.object({
          id: z.number(),
          customerAccountId: z.number(),
          date: z.string(),
          timeSlot: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const oldViewing = await dbFeature.getViewingById(input.id);

        // Strict double-booking check for new slot
        if (oldViewing) {
          const { checkSlotAvailability } = await import("./googleCalendarService");
          const avail = await checkSlotAvailability({
            agentId: oldViewing.agentId,
            date: input.date,
            timeSlot: input.timeSlot,
            excludeViewingId: input.id,
          });

          if (!avail.available) {
            throw new TRPCError({
              code: "CONFLICT",
              message: avail.reason || "The selected reschedule slot has a calendar conflict.",
            });
          }
        }

        const viewing = await dbFeature.rescheduleViewingDirect(input.id, input.date, input.timeSlot);
        if (viewing) {
          if (input.notes !== undefined) {
            const db = await (await import("./db")).getDb();
            if (db) {
              const { propertyViewings } = await import("../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              await db.update(propertyViewings).set({ notes: input.notes }).where(eq(propertyViewings.id, input.id));
            }
          }

          // Sync reschedule to Google Calendar
          if (oldViewing?.googleCalendarEventId) {
            try {
              const { updateGoogleCalendarEvent } = await import("./googleCalendarService");
              await updateGoogleCalendarEvent({
                eventId: oldViewing.googleCalendarEventId,
                agentId: viewing.agentId,
                newDate: input.date,
                newTimeSlot: input.timeSlot,
                notes: input.notes,
              });
            } catch (calErr) {
              console.warn("[GoogleCalendar] Reschedule update notice:", calErr);
            }
          } else {
            try {
              const customer = await dbFeature.getCustomerAccountById(input.customerAccountId);
              const { createGoogleCalendarEvent } = await import("./googleCalendarService");
              const calResult = await createGoogleCalendarEvent({
                viewing: { ...viewing, notes: input.notes ?? viewing.notes },
                customer: {
                  name: customer?.name || "VIP Client",
                  email: customer?.email || "darrylraushansingh@gmail.com",
                  phone: customer?.phone,
                },
              });
              if (calResult.success && calResult.eventId) {
                await dbFeature.updateViewingGoogleCalendar(viewing.id, {
                  googleCalendarEventId: calResult.eventId,
                  googleCalendarHtmlLink: calResult.htmlLink || null,
                });
                viewing.googleCalendarEventId = calResult.eventId;
                viewing.googleCalendarHtmlLink = calResult.htmlLink || null;
              }
            } catch (calErr) {
              console.warn("[GoogleCalendar] Reschedule auto-create notice:", calErr);
            }
          }

          try {
            const customer = await dbFeature.getCustomerAccountById(input.customerAccountId);
            if (customer && customer.phone) {
              const { formatRescheduleConfirmation } = await import("./whatsappService");
              const reply = formatRescheduleConfirmation(viewing, customer.name);
              const { sendLiveWhatsAppMessage } = await import("./whatsappBaileys");
              await sendLiveWhatsAppMessage(customer.phone, reply);
            }
            if (customer) {
              const { notifyViewingRescheduled } = await import("./emailService");
              await notifyViewingRescheduled({
                viewing: { ...viewing, notes: input.notes ?? viewing.notes },
                customer: {
                  id: customer.id,
                  name: customer.name,
                  email: customer.email || "darrylraushansingh@gmail.com",
                  phone: customer.phone,
                },
                oldDate: oldViewing?.date,
                oldSlot: oldViewing?.timeSlot,
                source: "customer_portal",
              });
            }
          } catch (err) {
            console.warn("[WhatsApp/Email Notification] Could not dispatch auto-reschedule alerts:", err);
          }
        }
        return viewing;
      }),

    // Profile & Preferences
    getProfile: publicProcedure
      .input(z.object({ customerAccountId: z.number() }))
      .query(async ({ input }) => {
        const account = await dbFeature.getCustomerAccountById(input.customerAccountId);
        if (!account) return null;
        return {
          id: account.id,
          name: account.name,
          email: account.email,
          phone: account.phone,
          avatarInitials: account.avatarInitials,
          segment: account.segment,
          budget: account.budget,
          preferredLocation: account.preferredLocation,
          preferredTypes: account.preferredTypes,
          minBeds: account.minBeds ?? 0,
          investmentGoal: account.investmentGoal,
          preferredFeatures: account.preferredFeatures,
        };
      }),

    updateProfile: publicProcedure
      .input(
        z.object({
          customerAccountId: z.number(),
          name: z.string().optional(),
          phone: z.string().optional(),
          segment: z.string().optional(),
          budget: z.string().optional(),
          preferredLocation: z.string().optional(),
          preferredTypes: z.string().optional(),
          minBeds: z.number().optional(),
          investmentGoal: z.string().optional(),
          preferredFeatures: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { customerAccountId, ...updateData } = input;
        const updated = await dbFeature.updateCustomerAccount(customerAccountId, updateData);
        if (!updated) throw new Error("Failed to update profile");
        return {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          avatarInitials: updated.avatarInitials,
          segment: updated.segment,
          budget: updated.budget,
          preferredLocation: updated.preferredLocation,
          preferredTypes: updated.preferredTypes,
          minBeds: updated.minBeds ?? 0,
          investmentGoal: updated.investmentGoal,
          preferredFeatures: updated.preferredFeatures,
        };
      }),
  }),

  // WhatsApp Integration & Live Device Connection Endpoints
  whatsapp: router({
    getLiveStatus: publicProcedure.query(async () => {
      const { getWhatsAppLiveState } = await import("./whatsappBaileys");
      return getWhatsAppLiveState();
    }),

    startLiveConnection: publicProcedure
      .input(
        z.object({
          customerAccountId: z.number().optional(),
        }).optional()
      )
      .mutation(async ({ input }) => {
        const { startWhatsAppBaileys, setActiveCustomerAccountId } = await import("./whatsappBaileys");
        // Bind caller's customer account ID so the QR link targets the right buyer profile
        if (input?.customerAccountId) {
          setActiveCustomerAccountId(input.customerAccountId);
        }
        await startWhatsAppBaileys(input?.customerAccountId);
        const { getWhatsAppLiveState } = await import("./whatsappBaileys");
        return getWhatsAppLiveState();
      }),

    disconnectLiveSession: publicProcedure.mutation(async () => {
      const { disconnectWhatsAppSession } = await import("./whatsappBaileys");
      await disconnectWhatsAppSession();
      return { success: true };
    }),

    sendLiveMessage: publicProcedure
      .input(
        z.object({
          phone: z.string(),
          text: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const { sendLiveWhatsAppMessage } = await import("./whatsappBaileys");
        return sendLiveWhatsAppMessage(input.phone, input.text);
      }),

    syncChatHistoryToPhone: publicProcedure
      .input(
        z.object({
          customerAccountId: z.number().optional().default(1),
          limit: z.number().optional().default(8),
        }).optional()
      )
      .mutation(async ({ input }) => {
        const { syncHistoryToConnectedPhone } = await import("./whatsappBaileys");
        return syncHistoryToConnectedPhone(input?.customerAccountId ?? 1, input?.limit ?? 8);
      }),

    getMessages: publicProcedure
      .input(
        z.object({
          phone: z.string().optional(),
          viewingId: z.number().optional(),
          customerAccountId: z.number().optional(),
          limit: z.number().optional(),
        }).optional()
      )
      .query(({ input }) => dbFeature.getWhatsAppMessages(input)),

    simulateIncoming: publicProcedure
      .input(
        z.object({
          from: z.string(),
          body: z.string().min(1),
          senderName: z.string().optional(),
          customerAccountId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return handleIncomingWhatsAppMessage({
          from: input.from,
          body: input.body,
          senderName: input.senderName,
          customerAccountIdHint: input.customerAccountId,
          messageSid: `sim_${Date.now()}`,
        });
      }),

    getStats: publicProcedure.query(() => dbFeature.getWhatsAppStats()),

    sendAgentReminder: publicProcedure
      .input(
        z.object({
          phone: z.string(),
          agentName: z.string(),
          customerName: z.string(),
          propertyTitle: z.string(),
          date: z.string(),
          timeSlot: z.string(),
          viewingId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const message = [
          `🏛️ *PROPERLY LUXURY REAL ESTATE*`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `*Tour Reminder from ${input.agentName}* ⏰`,
          ``,
          `Dear *${input.customerName}*,`,
          `Looking forward to meeting you tomorrow for the private viewing of *${input.propertyTitle}* at *${input.timeSlot}*.`,
          ``,
          `📍 Please let me know if you need driver directions or valet assistance.`,
          `👉 Reply *CANCEL* if you need to reschedule.`,
        ].join("\n");

        return dbFeature.logWhatsAppMessage({
          phone: input.phone,
          senderName: input.agentName,
          viewingId: input.viewingId,
          direction: "outgoing",
          messageType: "reminder",
          message,
          status: "sent",
          parsedAction: "confirm_viewing",
        });
      }),

    // Get .ics Calendar Invite File Content
    getCalendarInvite: publicProcedure
      .input(
        z.object({
          viewingId: z.number(),
          customerName: z.string().optional(),
          customerEmail: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const viewing = await dbFeature.getViewingById(input.viewingId);
        if (!viewing) throw new Error("Viewing not found");
        const { generateViewingIcs } = await import("./whatsappService");
        const icsContent = generateViewingIcs(
          viewing,
          input.customerName || "VIP Client",
          input.customerEmail || "client@properly.my"
        );
        const cleanTitle = viewing.propertyTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 28);
        const cleanDate = viewing.date.replace(/[^a-zA-Z0-9_-]/g, "_");
        const fileName = `VIP_Tour_${cleanTitle}_${cleanDate}.ics`;
        return { icsContent, fileName };
      }),

    // Send .ics Calendar Invite File directly to connected WhatsApp
    sendCalendarInviteToPhone: publicProcedure
      .input(
        z.object({
          viewingId: z.number(),
          customerAccountId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const viewing = await dbFeature.getViewingById(input.viewingId);
        if (!viewing) throw new Error("Viewing not found");
        const customer = input.customerAccountId
          ? await dbFeature.getCustomerAccountById(input.customerAccountId)
          : null;
        const { sendViewingCalendarInvite } = await import("./whatsappBaileys");
        return sendViewingCalendarInvite(viewing, customer);
      }),
  }),
});

export type AppRouter = typeof appRouter;
