# Sales Intelligence Desk Validation

## Desktop

The Analytics route now renders a compact Sales Intelligence Desk. The forecast selector updates the decision narrative, expected sales, estimated commission, and confidence display; the live 30-day selection changed the forecast to RM 5.7M, RM 188k commission, and 82% confidence. The deep-teal forecast hero maintains readable contrast, while the funnel diagnosis, intervention queue, demand drivers, and management read remain visually distinct.

## Mobile at 375×812

The page preserves its decision-first order: forecast horizon, forecast card, funnel leak, intervention queue, drivers, and management read. The forecast metrics remain compact, action copy wraps inside its cards, and the source/location drivers retain readable hierarchy in the single-column flow.

## Workflow

The Funnel Diagnosis call-to-action routes to the existing Leads action desk, so the Analytics diagnosis has a direct follow-through workflow instead of being a static chart.

## Transparent preview and follow-up refinement

The Sales Intelligence Desk now identifies its current forecast, funnel, and driver values as frontend-preview analytics until CRM aggregation is connected. The intervention queue derives an overdue item from each lead’s existing `lastContacted` workflow timestamp; the live preview surfaced Ravi Nair after six days without a logged contact. The funnel action now opens `/leads?focus=viewing`, where a dedicated viewing-follow-up banner and a filtered two-lead queue replace the generic route hand-off.

The updated 375×812 Analytics capture keeps the preview disclosure, 30/60/90 selector, deep-teal forecast card, readable overdue intervention, funnel call-to-action, driver rows, and management actions in a clear vertical order without clipped controls or overlapping content.

At 375×812, `/leads?focus=viewing` keeps the focused-workflow banner and clear-focus control directly below the hero, preserves the two-lead KPI totals and next-best-action card, and retains the filtered lead-table controls in a readable mobile stack. No controls overlap or extend outside their cards.

## Funnel-chart refinement

The Analytics funnel now uses a three-layer halo treatment with stage labels, values, and percent-of-enquiry badges. Selecting **Viewings** updates the focused context to 56 leads, 34% progression from Qualified, and 13% of enquiries, while retaining the targeted viewing-follow-up action beside the diagnosis.

At 375×812, all four funnel stages retain visible labels, values, and percentage badges. The stage-context readout stays directly beneath the funnel, while the leak diagnosis and viewing-follow-up action remain readable in the compact single-column flow.

A direct 375×812 interaction check selected **Viewings** and confirmed that the stage-focus readout changed to “Viewings · 56 leads,” with the correct 34% Qualified-to-Viewings conversion and 13% enquiry share. Each stage and the readout fitted fully inside the 375px viewport, and the viewing-follow-up call-to-action remained visible.
