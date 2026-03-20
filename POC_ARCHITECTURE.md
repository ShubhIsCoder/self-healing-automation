# POC Architecture: Intent-Preservation Healing Engine (IPHE)

## 1. Core Objective
Solve the "Semantic Wrong-Heal" problem by shifting from attribute-matching (e.g., "Find button with ID 'submit'") to intent-matching (e.g., "Complete the purchase").

## 2. Component Breakdown

### A. The Intent Capture Layer (Recorder/Input)
*   **Action Metadata:** Instead of just recording `XPath` or `CSS Selector`, we record the **Intent Label** (e.g., `ACTION_SUBMIT_PAYMENT`) and the **Visual Context** (screenshot snippet of the element and its neighbors).
*   **State Snapshot:** Record the DOM state *before* and *after* the action to understand the "State Transition."

### B. The Discovery Engine (The Healer)
When a selector fails:
1.  **Candidate Gathering:** Scrape all interactive elements in the current view.
2.  **Multimodal Analysis (Vision + DOM):** 
    *   **Vision:** Use a lightweight vision model (or CLIP embeddings) to find elements that "look" like the original intent.
    *   **DOM Semantic Scoring:** Use an LLM to rank candidates based on their accessibility labels, nearby text, and tag hierarchy. 
    *   *Example:* If "Submit" is gone, but "Confirm Order" exists in the same relative position with similar parent attributes, it gets a high score.
3.  **Conflict Resolution:** If a "Cancel" button is nearby, the engine explicitly rejects it because its *semantic meaning* (intent) contradicts the original action.

### C. The Verification Loop (Human-in-the-Loop)
*   **Confidence Thresholds:** 
    *   >95%: Auto-heal and log.
    *   70-95%: Execute, but flag for "One-Tap Review."
    *   <70%: Pause and request manual mapping.

## 3. Technical Stack (POC)
*   **Language:** Node.js / Python
*   **Browser Automation:** Playwright (for its robust selector engine and trace capabilities)
*   **Inference:** OpenAI GPT-4o-mini (Vision + Text) for high-accuracy semantic mapping.
*   **Database:** Simple JSON/Vector store for "Intent Signatures."

## 4. Why This Wins
Unlike Mabl or Testim, which use fuzzy heuristics, our engine uses **Semantic Understanding**. It won't "wrong-heal" a Submit button into a Cancel button because it understands that "Cancel" is the inverse of the intended goal.

---
**Status:** Drafted. 
**Next Step:** I can generate a basic Playwright script that demonstrates a "Semantic Search" fallback when a primary button ID is missing. 🔥
