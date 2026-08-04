import type { ComponentType } from "react";

/**
 * The contract every concept module must satisfy to appear in the
 * playground. Adding a new AI engineering concept (fine-tuning, prompt
 * engineering, agents, evaluation, ...) means creating one object like
 * this and registering it in `concept-registry.ts` -- nothing else in
 * the app needs to change. See README.md > "Adding a new concept".
 */
export interface ConceptModule {
  /** URL-safe id, used as the /concepts/[id] route segment. */
  id: string;
  /** Short display name, e.g. "Retrieval-Augmented Generation". */
  title: string;
  /** One-line hook shown on the home page card. */
  tagline: string;
  /** 2-4 sentence description shown on the home page card and concept header. */
  description: string;
  /** Rough grouping for the home page (e.g. "Retrieval", "Generation", "Agents"). */
  category: string;
  /** Approx time to work through the module, shown as a hint, e.g. "10-15 min". */
  estimatedTime: string;
  /** The client component that renders the whole concept experience. */
  Component: ComponentType;
}
