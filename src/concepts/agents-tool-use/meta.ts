import type { ConceptModule } from "@/lib/concept-types";
import { AgentsToolUseConcept } from "./AgentsToolUseConcept";

export const agentsToolUseMeta: Omit<ConceptModule, "Component"> = {
  id: "agents-tool-use",
  title: "Agents & Tool Use",
  tagline: "Watch an agent decide whether -- and which -- tool to call.",
  description:
    "Ask a question and step through an agent's reasoning: does it need a tool, which one, what it returns, and how that shapes the final answer. Disable tools to see the agent's path change, then compare a direct-answer, single-tool-call, and multi-step reasoning loop side by side.",
  category: "Agents",
  estimatedTime: "8-12 min",
};

export const agentsToolUseConcept: ConceptModule = {
  ...agentsToolUseMeta,
  Component: AgentsToolUseConcept,
};
