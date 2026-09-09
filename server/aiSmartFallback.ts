import type { SystemDataContext } from "./aiContext";

export interface AIResponsePayload {
  content: string;
}

export function generateSmartAIResponse(
  userQuery: string,
  context: SystemDataContext
): string {
  const query = userQuery.toLowerCase();
  const formatRM = (val: number) => `RM ${Math.round(val).toLocaleString("en-MY")}`;

  // 0. Mortgage & Loan Installment Calculation / DSR Estimation
  if (
    query.includes("loan") ||
    query.includes("mortgage") ||
    query.includes("installment") ||
    query.includes("repayment") ||
    query.includes("calculate") ||
    query.includes("dsr") ||
    query.includes("stamp duty")
  ) {
    // Extract any number or pick default property price (e.g. RM 1,000,000)
    const match = query.match(/(\d[\d,\.]*)\s*(k|m|million|thousand)?/i);
    let propertyPrice = 1000000;
    if (match) {
      let rawVal = parseFloat(match[1].replace(/,/g, ""));
      if (match[2]) {
        const unit = match[2].toLowerCase();
        if (unit.startsWith("m")) rawVal *= 1_000_000;
        else if (unit.startsWith("k") || unit.startsWith("thou")) rawVal *= 1_000;
      }
      if (rawVal > 10000) propertyPrice = rawVal;
    } else if (context.propertiesSummary.length > 0) {
      propertyPrice = context.propertiesSummary[0].price;
    }

    const loanAmount = propertyPrice * 0.9; // 90% margin of finance
    const annualRate = 0.042; // standard 4.2% p.a.
    const monthlyRate = annualRate / 12;
    const tenureMonths = 35 * 12; // 35 years
    const monthlyPayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);

    // MOT Stamp Duty calculation (Malaysia Tier)
    let mot = 0;
    if (propertyPrice > 1000000) {
      mot = 100000 * 0.01 + 400000 * 0.02 + 500000 * 0.03 + (propertyPrice - 1000000) * 0.04;
    } else if (propertyPrice > 500000) {
      mot = 100000 * 0.01 + 400000 * 0.02 + (propertyPrice - 500000) * 0.03;
    } else if (propertyPrice > 100000) {
      mot = 100000 * 0.01 + (propertyPrice - 100000) * 0.02;
    } else {
      mot = propertyPrice * 0.01;
    }
    const loanStampDuty = loanAmount * 0.005;

    const calcChart = {
      type: "donut",
      title: `Financial Breakdown for ${formatRM(propertyPrice)}`,
      description: "Down payment, loan principal, and estimated legal fees",
      data: [
        { label: "Loan Principal (90%)", value: Math.round(loanAmount) },
        { label: "Down Payment (10%)", value: Math.round(propertyPrice * 0.1) },
        { label: "Est. MOT & Legal", value: Math.round(mot + loanStampDuty) },
      ],
      xKey: "label",
      yKey: "value",
    };

    const decisionBlock = {
      title: "Financing Action Steps",
      recommendations: [
        {
          action: `Target buyers with minimum nett household income of ${formatRM(monthlyPayment * 2.2)} (DSR < 45%)`,
          type: "eligibility",
        },
        {
          action: `Check developer incentives (e.g. Free SPA, Free MOT absorptions) to reduce entry capital`,
          type: "incentive",
        },
      ],
      quickActions: [
        { label: "Match Eligible Leads", target: "/leads" },
        { label: "Browse Properties", target: "/properties" },
      ],
    };

    return `### 🧮 Malaysian Mortgage & Financial Feasibility Analysis

For a property valued at **${formatRM(propertyPrice)}**:

| Component | Estimate | Parameters |
|---|---|---|
| **Down Payment (10%)** | **${formatRM(propertyPrice * 0.1)}** | Standard 90% loan margin |
| **Loan Financing (90%)** | **${formatRM(loanAmount)}** | 35-Year Tenure @ 4.2% p.a. |
| **Monthly Repayment** | **${formatRM(monthlyPayment)} / month** | Principal + Interest |
| **Est. MOT Stamp Duty** | **${formatRM(mot)}** | Tiered Malaysian Scale |
| **Loan Agreement Duty** | **${formatRM(loanStampDuty)}** | 0.5% of loan amount |
| **Min. Recommended Income** | **${formatRM(monthlyPayment * 2.5)}** | Based on max 40% Debt Service Ratio (DSR) |

<<<CHART_DATA
${JSON.stringify(calcChart, null, 2)}
>>>

<<<DECISION_CARD
${JSON.stringify(decisionBlock, null, 2)}
>>>

💡 *Need a custom calculation for a different property price or tenure? Simply ask e.g. "Calculate loan for RM 1.5M over 30 years".*`;
  }

  // 0.5 WhatsApp & Pitch Generator
  if (
    query.includes("pitch") ||
    query.includes("whatsapp") ||
    query.includes("script") ||
    query.includes("message") ||
    query.includes("outreach")
  ) {
    const topLead = context.leadsSummary[0] || {
      name: "Marcus Tan",
      property: "Asteria Residences",
      segment: "Investor",
    };

    return `### 📱 High-Conversion WhatsApp Outreach Templates

Here are ready-to-send outreach pitches tailored to your current active leads:

---

#### 1. 🌟 Exclusive Priority Unit Release (High-Yield Investor)
> *"Hi ${topLead.name.split(" ")[0]}, following up on your property portfolio strategy. We just secured an exclusive priority unit release at **${topLead.property}** with high rental yield projections and developer absorption packages. Would you be open for a private 10-minute preview walk-through this Friday or Saturday?"*

---

#### 2. 🇲🇾 Bahasa Malaysia Pitch (Family / Own-Stay Buyer)
> *"Salam sejahtera ${topLead.name.split(" ")[0]}, terima kasih atas minat anda terhadap **${topLead.property}**. Berita baik — kami baru buka unit corner/pilihan dengan pakej promosi tempahan awal termasuk percuma yuran guaman SPA. Boleh saya kongsikan e-brochure lengkap untuk rujukan anda?"*

---

#### 3. ⏰ Urgency / Limited Slot Invitation
> *"Hi ${topLead.name.split(" ")[0]}, quick update on **${topLead.property}** — only 3 selected layout units remain in this launch phase before price revision next month. Shall I reserve a private showroom viewing slot for you this weekend?"*

💡 *Click **Copy Pitch** inside the decision card or reply with a lead name to get a hyper-customized message!*`;
  }

  // 0.8 Objection Handling Matrix
  if (
    query.includes("objection") ||
    query.includes("expensive") ||
    query.includes("interest rate") ||
    query.includes("wait") ||
    query.includes("reject")
  ) {
    return `### 🛡️ Real Estate Objection Killer Matrix

Here is how top Malaysian property agents systematically address common buyer hesitations:

#### 1. Objection: *"The price per sq ft is too high compared to nearby projects."*
- **Response Framework:** Focus on net efficiency, developer track record, and integrated amenities.
- **Agent Script:**
  > *"I completely understand price is a key consideration. When looking at total cost of ownership, ${context.propertiesSummary[0]?.title || "this project"} features higher usable layout efficiency without wasted corridor space, plus lower maintenance sinking fund rates and guaranteed defect liability warranties."*

#### 2. Objection: *"I want to wait for interest rates to drop."*
- **Response Framework:** Highlight property price appreciation outrunning minor interest differences.
- **Agent Script:**
  > *"While waiting for a 0.25% rate adjustment might save ~RM 80/month on installment, property entry prices in this growth corridor typically appreciate 4–6% year-on-year. Entering during the early-bird phase locks in today's baseline price with developer absorption perks."*

#### 3. Objection: *"I need to discuss with my spouse/partner first."*
- **Response Framework:** Offer zero-risk booking reservation or joint private tour.
- **Agent Script:**
  > *"Absolutely, property is a major family decision. How about I prepare a customized 2-page financial summary comparing monthly commitment vs potential rental yield so you have all the exact numbers ready for your discussion tonight?"*`;
  }

  // 1. Sales Trend / Monthly Revenue / Financial Charts
  if (
    query.includes("trend") ||
    query.includes("sales") ||
    query.includes("monthly") ||
    query.includes("revenue") ||
    query.includes("chart of sales") ||
    query.includes("performance")
  ) {
    const trendData = context.salesTrend.map((s) => ({
      label: s.month,
      value: Math.round((s.value / 1_000_000) * 10) / 10,
      formatted: `RM ${(s.value / 1_000_000).toFixed(1)}M`,
    }));

    const totalSales = context.salesTrend.reduce((a, b) => a + b.value, 0);
    const avgMonthly = totalSales / (context.salesTrend.length || 1);

    const chartBlock = {
      type: "bar",
      title: "Monthly Sales Performance (RM Millions)",
      description: "2024–2025 closed sales volume across all development projects",
      data: trendData,
      xKey: "label",
      yKey: "value",
      color: "#284762",
      yUnit: "M",
    };

    const decisionBlock = {
      title: "Executive Revenue Strategy",
      recommendations: [
        {
          action: "Focus on Q3/Q4 luxury launches to capture peak demand cycle",
          type: "strategy",
        },
        {
          action: "Review pipeline velocity for high-margin properties above RM 2.0M",
          type: "action",
        },
      ],
      quickActions: [
        { label: "View High-Value Leads", target: "/leads" },
        { label: "Check Analytics", target: "/analytics" },
      ],
    };

    return `### 📊 Monthly Sales Trend & Revenue Analysis

Based on live transaction records, total recorded sales volume stands at **${formatRM(totalSales)}**, averaging **RM ${(avgMonthly / 1_000_000).toFixed(2)}M per month**.

**Key Sales Insights:**
- **Peak Performance:** Sales peaked in high-velocity months with strong demand in integrated luxury developments.
- **Projected Commission Pipeline:** Based on current active lead probabilities, expected closing volume will deliver strong momentum.

<<<CHART_DATA
${JSON.stringify(chartBlock, null, 2)}
>>>

<<<DECISION_CARD
${JSON.stringify(decisionBlock, null, 2)}
>>>

💡 *Tip: You can ask me to break down sales by property category or lead acquisition source.*`;
  }

  // 2. Lead Priority / Hot Leads / Prioritization Decisions
  if (
    query.includes("lead") ||
    query.includes("priorit") ||
    query.includes("call") ||
    query.includes("contact") ||
    query.includes("who to") ||
    query.includes("next action")
  ) {
    const highLeads = context.leadsSummary
      .filter((l) => l.priority === "High" || l.probability >= 70)
      .sort((a, b) => b.value * b.probability - a.value * a.probability)
      .slice(0, 5);

    const priorityChartData = context.metrics.priorityDistribution.map((p) => ({
      label: `${p.priority} Priority`,
      value: p.count,
      color: p.priority === "High" ? "#dc2626" : p.priority === "Medium" ? "#d97706" : "#2563eb",
    }));

    const chartBlock = {
      type: "pie",
      title: "Lead Distribution by Priority Tier",
      description: `Active pool of ${context.metrics.totalLeads} qualified prospects`,
      data: priorityChartData,
      xKey: "label",
      yKey: "value",
    };

    const topLead = highLeads[0];

    const decisionBlock = {
      title: "Immediate Agent Action Plan",
      recommendations: highLeads.map((l) => ({
        leadId: l.id,
        name: l.name,
        property: l.property,
        value: formatRM(l.value),
        probability: `${l.probability}%`,
        action: l.action,
        urgency: l.probability >= 80 ? "Critical" : "High",
      })),
      quickActions: [
        { label: "Filter Leads: High Priority", target: "/leads?priority=High" },
        { label: "View Priority Queue", target: "/leads" },
      ],
    };

    const leadListMarkdown = highLeads
      .map(
        (l, i) =>
          `**${i + 1}. ${l.name}** (${l.segment})\n- 🏷️ **Property:** ${l.property}\n- 💰 **Deal Value:** ${formatRM(l.value)} (*${l.probability}% Closing Probability*)\n- 🎯 **Recommended Action:** ${l.action}`
      )
      .join("\n\n");

    return `### 🎯 Lead Prioritization & Action Recommendations

You currently have **${context.metrics.highPriority} High Priority leads** representing **${formatRM(context.metrics.expectedSalesValue)}** in weighted pipeline value.

#### Top Recommended Prospects to Engage Immediately:
${leadListMarkdown || "No high priority leads at this time."}

<<<CHART_DATA
${JSON.stringify(chartBlock, null, 2)}
>>>

<<<DECISION_CARD
${JSON.stringify(decisionBlock, null, 2)}
>>>

${topLead ? `📱 **Suggested WhatsApp Follow-up Pitch for ${topLead.name}:**\n> *"Hi ${topLead.name.split(" ")[0]}, following up on your interest in ${topLead.property}. We have just received an exclusive priority unit release this week with favorable financing perks. Would you be available for a brief 10-minute viewing discussion today?"*` : ""}`;
  }

  // 3. Enquiry Sources / Channel Breakdown Chart
  if (
    query.includes("source") ||
    query.includes("channel") ||
    query.includes("enquiry") ||
    query.includes("marketing") ||
    query.includes("acquisition")
  ) {
    const sourceChartData = context.enquirySources.map((e) => ({
      label: e.source,
      value: e.count,
      percentage: `${e.percentage}%`,
      formatted: `${e.count} leads (${e.percentage}%)`,
    }));

    const chartBlock = {
      type: "donut",
      title: "Lead Acquisition Channels Breakdown",
      description: "Distribution of inbound lead generation sources",
      data: sourceChartData,
      xKey: "label",
      yKey: "value",
    };

    const decisionBlock = {
      title: "Marketing & Conversion Decisions",
      recommendations: [
        {
          action: "Increase ad spend on high-converting property portal campaigns",
          type: "marketing",
        },
        {
          action: "Incentivize referral programs for VIP repeat buyers",
          type: "sales",
        },
      ],
      quickActions: [{ label: "View Analytics Hub", target: "/analytics" }],
    };

    return `### 🥧 Enquiry Channels & Marketing Source Mix

Here is the breakdown of how prospects are discovering your property listings:

${context.enquirySources.map((e) => `- **${e.source}:** ${e.count} enquiries (**${e.percentage}%**)`).join("\n")}

**Strategic Recommendation:**
Referral network and high-intent property portals demonstrate the highest conversion velocity to viewing appointments. Allocate agent follow-up bandwidth accordingly.

<<<CHART_DATA
${JSON.stringify(chartBlock, null, 2)}
>>>

<<<DECISION_CARD
${JSON.stringify(decisionBlock, null, 2)}
>>>`;
  }

  // 4. Funnel / Pipeline Stages & Conversion Rates
  if (
    query.includes("funnel") ||
    query.includes("pipeline") ||
    query.includes("conversion") ||
    query.includes("stage") ||
    query.includes("drop")
  ) {
    const funnelChartData = context.pipelineStages.map((p) => ({
      label: p.name,
      value: p.count,
      conversionRate: `${p.conversionRate}%`,
      formatted: `${p.count} (${p.conversionRate}% Conv)`,
    }));

    const chartBlock = {
      type: "bar",
      title: "Sales Pipeline Funnel Stages & Conversion",
      description: "Drop-off and stage progression across active prospects",
      data: funnelChartData,
      xKey: "label",
      yKey: "value",
      color: "#059669",
    };

    const decisionBlock = {
      title: "Pipeline Optimization Decisions",
      recommendations: [
        {
          action: "Accelerate viewing-to-negotiation bridge by preparing pre-approved loan packages",
          type: "pipeline",
        },
        {
          action: "Set automated 24-hour follow-up triggers after physical showroom visits",
          type: "pipeline",
        },
      ],
      quickActions: [{ label: "Explore Pipeline Health", target: "/analytics" }],
    };

    return `### 📉 Pipeline Conversion Funnel Analysis

Tracking prospect flow across stages reveals where deal momentum is strongest:

${context.pipelineStages.map((p) => `- **${p.name}:** ${p.count} prospects (**${p.conversionRate}%** stage conversion)`).join("\n")}

**Funnel Health Assessment:**
The largest drop-off occurs between *Viewing Scheduled* and *Negotiation*. Providing comparative pricing dossiers during physical viewings will significantly increase offer conversions.

<<<CHART_DATA
${JSON.stringify(chartBlock, null, 2)}
>>>

<<<DECISION_CARD
${JSON.stringify(decisionBlock, null, 2)}
>>>`;
  }

  // 5. Properties / Inventory / Pricing Comparison
  if (
    query.includes("property") ||
    query.includes("price") ||
    query.includes("listing") ||
    query.includes("inventory") ||
    query.includes("condo") ||
    query.includes("house")
  ) {
    const propChartData = context.propertiesSummary.slice(0, 6).map((p) => ({
      label: p.title.length > 18 ? p.title.slice(0, 18) + "…" : p.title,
      value: Math.round((p.price / 1_000_000) * 100) / 100,
      formatted: `RM ${(p.price / 1_000_000).toFixed(2)}M`,
    }));

    const chartBlock = {
      type: "bar",
      title: "Top Properties Price Benchmarks (RM Millions)",
      description: "Listing comparison across key active development projects",
      data: propChartData,
      xKey: "label",
      yKey: "value",
      color: "#a9752e",
      yUnit: "M",
    };

    const decisionBlock = {
      title: "Inventory Matchmaking Decisions",
      recommendations: context.propertiesSummary.slice(0, 3).map((p) => ({
        property: p.title,
        price: formatRM(p.price),
        idealBuyer: p.price > 2000000 ? "VIP High Net Worth / Investors" : "Upgrader / Family Buyers",
        status: p.status,
      })),
      quickActions: [{ label: "Browse All Properties", target: "/properties" }],
    };

    return `### 🏢 Property Inventory & Valuation Overview

We currently have **${context.metrics.activeProperties} active property listings** across prime locations including Kuala Lumpur, Damansara, KLCC, and Petaling Jaya.

#### Featured Portfolio Highlights:
${context.propertiesSummary.slice(0, 5).map((p) => `- **${p.title}** (${p.developer}) — **${formatRM(p.price)}** | *${p.type}* (${p.beds} Bed, ${p.baths} Bath)`).join("\n")}

<<<CHART_DATA
${JSON.stringify(chartBlock, null, 2)}
>>>

<<<DECISION_CARD
${JSON.stringify(decisionBlock, null, 2)}
>>>`;
  }

  // Default Overview / General Sales Assistant Decision Engine
  const kpiData = [
    { label: "Active Leads", value: context.metrics.totalLeads },
    { label: "High Priority", value: context.metrics.highPriority },
    { label: "Active Listings", value: context.metrics.activeProperties },
    { label: "Confirmed Buyers", value: context.metrics.totalCustomers },
  ];

  const chartBlock = {
    type: "bar",
    title: "Property CRM Operational Highlights",
    description: "Core metrics overview across leads, inventory, and clients",
    data: kpiData,
    xKey: "label",
    yKey: "value",
    color: "#284762",
  };

  const decisionBlock = {
    title: "Next Best Agent Moves",
    recommendations: [
      {
        action: `Engage ${context.metrics.highPriority} high-priority leads with personalized brochures`,
        type: "leads",
      },
      {
        action: "Review stalled viewings older than 7 days to offer private viewing slots",
        type: "retention",
      },
    ],
    quickActions: [
      { label: "View Leads Queue", target: "/leads" },
      { label: "Review Properties", target: "/properties" },
    ],
  };

  return `### 🏠 Property AI Intelligence Summary

Welcome! I am connected directly to your live Property Sales CRM database. Here is your current business snapshot:

- **Total Active Leads:** ${context.metrics.totalLeads} (${context.metrics.highPriority} High Priority)
- **Expected Sales Pipeline:** ${formatRM(context.metrics.expectedSalesValue)}
- **Active Listings:** ${context.metrics.activeProperties} developments
- **Registered Buyers:** ${context.metrics.totalCustomers} clients

<<<CHART_DATA
${JSON.stringify(chartBlock, null, 2)}
>>>

<<<DECISION_CARD
${JSON.stringify(decisionBlock, null, 2)}
>>>

**How can I help you right now?**
- 📈 Ask: *"Show a chart of our monthly sales trends"*
- 🎯 Ask: *"Which leads should I call first today and what pitch should I use?"*
- 🥧 Ask: *"Break down our lead acquisition sources"*
- 🏢 Ask: *"Compare prices and types across available properties"*`;
}

/**
 * Customer-Facing Smart Fallback AI Engine.
 * Strictly answers only public property questions, buyer calculations, and location guides.
 * NEVER leaks internal leads, sales figures, pipeline conversions, or team data.
 */
export function generateCustomerSmartAIResponse(
  userQuery: string,
  properties: Array<any>
): string {
  const query = userQuery.toLowerCase().trim();
  const formatRM = (val: number) => `RM ${Math.round(val).toLocaleString("en-MY")}`;

  // 1. Simple Greetings
  if (
    query === "hi" ||
    query === "hello" ||
    query === "hey" ||
    query === "halo" ||
    query === "selamat pagi" ||
    query === "selamat petang" ||
    query.startsWith("hi ") ||
    query.startsWith("hello ")
  ) {
    const featuredTitles = properties.slice(0, 3).map((p) => `**${p.title}** (${p.location})`).join(", ");
    return `Hello and welcome! I am your **AI Property Concierge**.

I can help you explore our luxury residences across Malaysia, calculate loan repayments and MOT stamp duties, or guide you through foreign buyer guidelines.

---

### 💡 **Popular Inquiries You Can Ask:**

1. 🇲🇾 **Foreign Buyer Guidelines:** *"What are the foreign purchaser rules and price thresholds in KL and Selangor?"*
2. 📊 **Rental Yields & ROI:** *"Which properties offer the highest rental yield in your collection?"*
3. 🧮 **Mortgage & Affordability:** *"Calculate monthly repayment for an RM 1.5M property with a 30-year tenure."*
4. 🏙️ **Prime Neighborhoods:** *"Tell me about living in KLCC vs Damansara Heights."*
5. 🏢 **Featured Listings:** *Currently featuring ${featuredTitles || "luxury developments in prime locations"}.*

How may I assist your property search today?`;
  }

  // 2. Foreign Buyer Guidelines / MM2H / EPU
  if (
    query.includes("foreign") ||
    query.includes("mm2h") ||
    query.includes("epu") ||
    query.includes("expat") ||
    query.includes("overseas") ||
    query.includes("singaporean") ||
    query.includes("foreigner")
  ) {
    return `### 🇲🇾 Malaysian Foreign Purchaser & MM2H Guidelines (2024–2025)

Foreign individuals and overseas entities can readily acquire freehold and leasehold properties in Malaysia, subject to state-specific minimum thresholds and State Authority (EPU) consent:

---

#### 1. 📍 Minimum Purchase Thresholds by State
- **Kuala Lumpur (Federal Territory)**: Minimum purchase price of **RM 1,000,000** for strata residences (Condominiums, Serviced Apartments).
- **Selangor**: Minimum purchase price of **RM 2,000,000** for residential properties (strata or landed in designated zones).
- **Johor (Iskandar Malaysia / Medini Zone)**: Selected international zones offer relaxed thresholds or exemptions.
- **Penang**: RM 1,000,000 on the Island for strata residences.

---

#### 2. 📑 State Consent & Legal Process
- **State Authority Consent (EPU)**: A formal consent filing is submitted by your appointed conveyancing lawyer after signing the Sales & Purchase Agreement (SPA).
- **Consent Fees**: Typically RM 1,000–RM 2,000 in Kuala Lumpur, or ~2% in Selangor.
- **Processing Time**: Standard consent approvals take approximately 2 to 3 months.

---

#### 3. 💳 Financing & MM2H Visa Advantages
- **Margin of Financing (LTV)**: Commercial Malaysian banks generally grant **70% to 80%** loan financing for foreign purchasers.
- **MM2H (Malaysia My Second Home) Visa Holders**: Enjoy preferential financing terms and streamlined state consent approval.

*Would you like me to recommend properties in our collection that qualify for foreign purchase?*`;
  }

  // 3. Mortgage / Loan / Installment / DSR / Stamp Duty
  if (
    query.includes("loan") ||
    query.includes("mortgage") ||
    query.includes("installment") ||
    query.includes("repayment") ||
    query.includes("calculate") ||
    query.includes("dsr") ||
    query.includes("stamp duty") ||
    query.includes("mot")
  ) {
    const match = query.match(/(\d[\d,\.]*)\s*(k|m|million|thousand)?/i);
    let propertyPrice = 1500000;
    if (match) {
      let rawVal = parseFloat(match[1].replace(/,/g, ""));
      if (match[2]) {
        const unit = match[2].toLowerCase();
        if (unit.startsWith("m")) rawVal *= 1_000_000;
        else if (unit.startsWith("k") || unit.startsWith("thou")) rawVal *= 1_000;
      }
      if (rawVal > 10000) propertyPrice = rawVal;
    } else if (properties.length > 0) {
      propertyPrice = properties[0].price;
    }

    const loanAmount = propertyPrice * 0.9;
    const annualRate = 0.042; // 4.2% p.a.
    const monthlyRate = annualRate / 12;
    const tenureMonths = 30 * 12; // 30 years
    const monthlyPayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);

    // Malaysian MOT Stamp Duty
    let mot = 0;
    if (propertyPrice > 1000000) {
      mot = 100000 * 0.01 + 400000 * 0.02 + 500000 * 0.03 + (propertyPrice - 1000000) * 0.04;
    } else if (propertyPrice > 500000) {
      mot = 100000 * 0.01 + 400000 * 0.02 + (propertyPrice - 500000) * 0.03;
    } else if (propertyPrice > 100000) {
      mot = 100000 * 0.01 + (propertyPrice - 100000) * 0.02;
    } else {
      mot = propertyPrice * 0.01;
    }
    const loanStampDuty = loanAmount * 0.005;

    return `### 🧮 Mortgage & Financial Breakdown for **${formatRM(propertyPrice)}**

| Cost Item | Estimated Amount | Calculation Basis |
| :--- | :--- | :--- |
| **Down Payment (10%)** | **${formatRM(propertyPrice * 0.1)}** | Standard 90% loan facility |
| **Loan Amount (90%)** | **${formatRM(loanAmount)}** | 30-Year tenure @ 4.20% p.a. |
| **Estimated Monthly Installment** | **${formatRM(monthlyPayment)} / month** | Principal + Interest amortization |
| **MOT Stamp Duty (Transfer)** | **${formatRM(mot)}** | Tiered LHDN schedule (1%–4%) |
| **Loan Agreement Stamp Duty** | **${formatRM(loanStampDuty)}** | 0.50% of loan facility |
| **Min. Recommended Net Income** | **${formatRM(monthlyPayment / 0.45)} / month** | Based on conservative 45% DSR |

---

💡 *You can also use our interactive **Mortgage & Affordability Vault** tab to fine-tune down payment percentages and loan tenures!*`;
  }

  // 4. Rental Yields / Investment / ROI
  if (
    query.includes("yield") ||
    query.includes("roi") ||
    query.includes("return") ||
    query.includes("rent") ||
    query.includes("invest")
  ) {
    const yieldProps = [...properties]
      .filter((p) => p.rentalYield)
      .sort((a, b) => parseFloat(b.rentalYield || "0") - parseFloat(a.rentalYield || "0"))
      .slice(0, 4);

    const yieldList = yieldProps
      .map(
        (p) =>
          `• **${p.title}** (${p.location}) — **${p.rentalYield || "5.8%"} gross yield** | Priced from ${formatRM(p.price)} (${p.type})`
      )
      .join("\n");

    return `### 📈 Top Rental Yield Opportunities

In prime Kuala Lumpur and Selangor real estate, gross rental yields for premier strata residences average **5.2% to 6.5%**, driven by strong multinational corporate tenancy demand:

---

${yieldList || "• **The Conlay KLCC** — 6.4% gross yield\n• **Pavilion Damansara Heights** — 5.8% gross yield\n• **8 Conlay (Kempinski)** — 5.5% gross yield"}

---

#### 💡 **What Drives High Yields in Malaysia?**
1. **Transit-Oriented Connectivity**: Residences within 300m walking distance to MRT Putrajaya or Kajang lines.
2. **Compact 1–2 Bedroom Units**: Higher rent-per-square-foot ratios compared to large family penthouses.
3. **Integrated Amenities**: Developments with direct retail mall access and branded hospitality concierge management.`;
  }

  // 5. Prime Locations / Neighborhood Guides
  if (
    query.includes("klcc") ||
    query.includes("damansara") ||
    query.includes("mont kiara") ||
    query.includes("bangsar") ||
    query.includes("location") ||
    query.includes("neighborhood") ||
    query.includes("area")
  ) {
    return `### 🏙️ Prime Malaysian Residential Enclaves

Here is a brief guide to the top luxury residential corridors in Greater Kuala Lumpur:

---

- **KLCC (Kuala Lumpur City Centre)**: The premier diplomatic and financial epicenter. High-rise luxury living, walking distance to the Petronas Twin Towers, Suria KLCC, and KLCC Park. Strong expat tenant pool.
- **Damansara Heights**: Often described as the *"Beverly Hills of Malaysia"*. Exclusive, low-density, highly prestigious enclave with upscale dining and proximity to central KL and Bangsar.
- **Mont Kiara**: Malaysia's premier international family hub. Home to Garden International School (GIS) and Mont Kiara International School (MKIS), with rich lifestyle amenities.
- **Bangsar**: Cosmopolitan urban neighborhood famous for leafy avenues, bespoke cafes, boutique shopping, and instant access to the KL Sentral transportation hub.

---

*Would you like me to filter active residences located in any of these areas?*`;
  }

  // 6. Property Inventory & Specific Lookups
  if (
    query.includes("property") ||
    query.includes("listing") ||
    query.includes("residence") ||
    query.includes("condo") ||
    query.includes("penthouse") ||
    query.includes("house") ||
    query.includes("price")
  ) {
    const featured = properties.slice(0, 4);
    const propList = featured
      .map(
        (p) =>
          `• **${p.title}** by ${p.developer}\n  - Location: ${p.location} | Type: ${p.type}\n  - Layout: ${p.beds} Beds, ${p.baths} Baths (${p.size})\n  - Price: **${formatRM(p.price)}** (Est. Yield: ${p.rentalYield || "5.0%"})`
      )
      .join("\n\n");

    return `### 🏢 Featured Residences in Our Marketplace

Here are selected luxury residences from our current active collection:

---

${propList}

---

*To schedule a private viewing or view full architectural floor plans, click on any residence card in the **Explore Residences** tab!*`;
  }

  // 7. Fallback for Internal/Company Questions (Politely redirect)
  if (
    query.includes("sales") ||
    query.includes("revenue") ||
    query.includes("lead") ||
    query.includes("pipeline") ||
    query.includes("commission")
  ) {
    return `### 🤝 Customer Advisory Service

As your **AI Property Concierge**, I am here to help you with property recommendations, loan feasibility calculations, neighborhood insights, and foreign purchaser guidelines.

If you have specific commercial inquiries or wish to speak with our property specialists, your designated consultant is happy to assist you directly.

**Try asking:**
- *"What is the minimum foreign purchase price in Kuala Lumpur?"*
- *"Calculate monthly repayment for RM 2,000,000 over 30 years."*
- *"Which properties in Mont Kiara or KLCC have 3 bedrooms?"*`;
  }

  // 8. General Default Help
  return `### 🏠 AI Property Concierge

I am here to assist your property journey in Malaysia. How can I help you?

- 🇲🇾 **Foreign Buyer Rules:** Ask about MM2H and minimum purchase thresholds in KL/Selangor.
- 🧮 **Mortgage Calculator:** Ask for monthly repayment and MOT stamp duty estimates.
- 🏢 **Property Search:** Ask for properties matching your preferred location or budget.
- 📈 **Rental Yields:** Ask about high-yielding investment properties in our portfolio.`;
}

