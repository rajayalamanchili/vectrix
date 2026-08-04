import type { ConceptModule } from "@/lib/concept-types";
import { RagConcept } from "./RagConcept";

export const ragMeta: Omit<ConceptModule, "Component"> = {
  id: "rag",
  title: "Retrieval-Augmented Generation",
  tagline: "Watch a model look things up before it answers.",
  description:
    "Chunk a document, plot the chunks in embedding space, retrieve the ones nearest your question, and see the augmented prompt that gets built -- then compare naive RAG against five variants that each fix a different failure mode.",
  category: "Retrieval",
  estimatedTime: "12-18 min",
};

export const ragConcept: ConceptModule = {
  ...ragMeta,
  Component: RagConcept,
};
