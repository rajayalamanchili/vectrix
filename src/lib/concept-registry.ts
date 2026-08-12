import type { ConceptModule } from "./concept-types";
import { ragConcept } from "@/concepts/rag/meta";
import { agentsToolUseConcept } from "@/concepts/agents-tool-use/meta";

/**
 * Every concept module in the playground, in display order.
 *
 * To add a new concept:
 *   1. Create src/concepts/<your-concept>/ following the RAG module's
 *      shape (meta.ts + a top-level Component).
 *   2. Import its exported ConceptModule here and add it to this array.
 * The home page grid and the /concepts/[id] route both read from this
 * array alone -- no other file needs to change.
 */
export const conceptRegistry: ConceptModule[] = [ragConcept, agentsToolUseConcept];

export function getConcept(id: string): ConceptModule | undefined {
  return conceptRegistry.find((c) => c.id === id);
}
