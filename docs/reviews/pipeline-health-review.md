# Pipeline health verification

The Pipeline health card now uses a compact progress-legend structure: each funnel stage presents its colored marker, current lead count, percentage of the opening enquiry base, and a proportional progress track.

The stage rows are real buttons. Selecting **Bookings** changed the focused readout to “11% of qualified progressed to bookings,” confirming the interactive stage context works while the existing analytics-route control remains in the card header.

At the 375px mobile breakpoint, the Pipeline health card remains legible as a single-column progress legend. Each stage retains its marker, label, count, percent, track, and focused insight without overlap, while the analytics button remains visible in the card header.

The captured mobile dashboard preview was inspected directly. Pipeline health appears as a self-contained card between the Signal note and Source mix cards, with all three stage rows, their colored tracks, the focused insight, conversion footer, and top-right analytics control fully visible without overlap.

Selecting the Pipeline health header action navigated successfully to the existing `/analytics` workspace, confirming the redesign preserved the card’s analytics route.
