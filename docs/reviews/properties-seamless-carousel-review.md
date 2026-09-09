# Seamless carousel verification

The continuous depth rail was exercised in the browser using a partial drag and release. During the drag, the active card’s rendered horizontal transform changed from **-172.5px** to **-197.83px**, confirming that the card follows the gesture continuously rather than waiting for release. After release, the carousel settled from **Asteria Residences, 1 of 5** to **The Mews KL, 2 of 5**.

The on-screen interaction guidance now advertises drag, swipe, scroll, arrow-key, and Enter controls while the original listing and dossier workflow remains intact.

Wheel input was also tested in the browser. A wheel progression moved the focused listing from **The Mews KL, 2 of 5** to **Elmina Green, 3 of 5**, confirming that the rail supports scroll-based progression and snap settling in addition to direct manipulation.

At an emulated **375×812** viewport, a direct drag changed the active card’s rendered transform from a flat `matrix(...)` value to a depth-aware `matrix3d(...)` value during the gesture, then settled from **Elmina Green, 3 of 5** to **Asteria Residences, 1 of 5**. This confirms continuous depth motion and seamless looping at the mobile breakpoint.
