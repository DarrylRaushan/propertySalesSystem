import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
    // Customer portal login — email + password against customer_accounts table
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
      .mutation(({ input }) => dbFeature.createViewing({ ...input, status: "Confirmed" })),

    cancelViewing: publicProcedure
      .input(z.object({ id: z.number(), customerAccountId: z.number() }))
      .mutation(({ input }) => dbFeature.cancelViewing(input.id, input.customerAccountId)),

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
});

export type AppRouter = typeof appRouter;
