# Priority leads queue verification

The revised Priority leads section opens as a bounded listbox containing the first five local leads, with a visible “5 at once” label and “Scroll to load the next queue” instruction. The first queue includes Aiman Faris, Sarah Lim, Muhammad Zaki, Joanne Chong, and Ravi Nair.

Scrolling the internal queue to its lower edge triggered the incremental-load state and appended the next local batch: Nadia Ismail, Tan Wei Ming, and Amelia Lee. The default dashboard remains compact because the list itself scrolls rather than extending the page vertically.

The queue is implemented as a focusable listbox with scoped Arrow Up, Arrow Down, Home, End, and Enter handlers. These controls are intentionally attached to the queue rather than the document so they do not interfere with normal dashboard navigation.

Browser inspection exposed the queue as a labelled `listbox` containing the initial five lead buttons and, after scrolling, the three loaded lead buttons. The row-level expand action and the existing 3D preview action remain available inside the queue.

At the 375px mobile breakpoint, the Priority leads card retains its five-row queue, concise helper text, search and filter controls, and the `5 at once` indicator without disrupting the compact single-column dashboard sequence.
