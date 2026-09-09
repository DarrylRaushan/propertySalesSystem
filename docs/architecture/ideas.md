# Compact Sales Dashboard — Design Brief

## Three Initial Directions

### Theme Name: Quiet Command Center
Very Brief Intro: A low-noise operations dashboard with warm paper surfaces, crisp navy type, and a single electric-lime signal color. It makes dense information feel calm, editorial, and immediately scannable.
Probability: 0.06

### Theme Name: Signal Garden
Very Brief Intro: A softer, more expressive reporting space using botanical greens, sky blues, and translucent panels. It turns metrics into a gentle visual landscape without losing the feeling of a serious tool.
Probability: 0.03

### Theme Name: Midnight Revenue Room
Very Brief Intro: A dark, high-contrast sales cockpit with glowing chart lines and amber alerts. It is dramatic and fast, designed for teams who live in their dashboard all day.
Probability: 0.08

## Selected Direction: Quiet Command Center

### Design Movement
Editorial Swiss modernism translated into a contemporary operations console: restrained structure, confident typography, and asymmetry used to create hierarchy rather than decoration.

### Core Principles
1. **Compress before decorating.** The first viewport should answer what is happening, what needs attention, and where to act without forcing a long scan.
2. **Use one visual story per section.** Each card has a clear job, a short title, and a single primary signal.
3. **Make whitespace functional.** Larger gaps separate decisions; tighter gaps group evidence.
4. **Surface action, not just information.** Priority items are interactive rows with progress, owner, and next step visible at a glance.

### Color Philosophy
The foundation is a warm off-white that keeps the dashboard from feeling clinical. Deep ink navy anchors the navigation and header like a printed cover. A sour-lime accent marks attention and active states, while muted mint and blush panels distinguish positive momentum from risk without relying on saturated alert colors.

### Layout Paradigm
Use a persistent left rail with a compact “command strip” header. The main canvas is an asymmetric editorial composition: a wide priority worklist paired with a narrow signal column, then a responsive matrix of visual summaries. On small screens, the rail collapses into a top bar and the priority list becomes the first, dominant module.

### Signature Elements
- A **command strip** that compresses date range, page title, and primary actions into one measured band.
- **Signal tiles** with a short metric, a micro chart, and a directional change rather than oversized dashboard cards.
- **Priority rows** that combine a small circular progress indicator, a name, a horizontal progress track, and one next-action button.

### Interaction Philosophy
Every interaction should reduce cognitive load. Filters update the visible metrics in place, priority rows expand only when needed, and secondary actions live behind icon buttons with tooltips. Buttons feel tactile but brief, with no decorative motion that competes with the data.

### Animation
Use short 160–220ms ease-out transitions for hover, focus, filter changes, and row expansion. On first load, reveal the command strip, signal tiles, and priority rows with a 40ms stagger so the interface feels assembled, not delayed. Animate only opacity and transform. Respect `prefers-reduced-motion` by removing entrance movement.

### Typography System
Use **DM Sans** for the interface and **Bodoni Moda** sparingly for the wordmark and select large numeric moments. Interface labels use 10–11px uppercase tracking, body copy uses 12–14px with generous line height, and page titles use 30–38px with tight tracking. Numbers should feel compact and tabular.

### Brand Essence
An operational sales cockpit for teams who need a fast read on momentum and next actions, distinguished by editorial clarity instead of dashboard clutter. Personality: **composed, sharp, quietly confident**.

### Brand Voice
Headlines are direct and observant. CTAs are verbs with a clear payoff. Microcopy is brief, specific, and never performatively cheerful.

Example lines: “The week is moving in the right direction.” and “Open the next best action.”

### Wordmark & Logo
Use a compact abstract mark made from three offset vertical bars that align into a rising step, suggesting a sales cadence rather than a generic chart. Pair it with a tightly tracked “northstar” wordmark in lowercase.

### Signature Brand Color
**Signal Lime — #D7F26B.** It is bright enough to mark attention, soft enough to sit beside cream and navy, and ownable without looking like a generic success green.

