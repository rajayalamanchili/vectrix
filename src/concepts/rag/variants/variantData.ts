export interface FlowStage {
  label: string;
  changed?: boolean; // true if this stage differs from naive RAG
}

export interface RagVariant {
  id: string;
  name: string;
  oneLiner: string;
  problem: string; // what failure mode of naive RAG this addresses
  howItWorks: string;
  flow: FlowStage[];
  tradeoff: string;
}

export const ragVariants: RagVariant[] = [
  {
    id: "naive",
    name: "Naive RAG",
    oneLiner: "Embed the query, retrieve top-K, stuff into the prompt.",
    problem:
      "This is the baseline every other variant is compared against, not a fix for anything.",
    howItWorks:
      "The user's question is embedded as-is and matched directly against chunk embeddings. Whatever's nearest gets pasted into the prompt.",
    flow: [
      { label: "Query" },
      { label: "Embed query" },
      { label: "Retrieve top-K" },
      { label: "Generate" },
    ],
    tradeoff:
      "Fast and simple, but fragile: short or ambiguously-worded queries often embed poorly, missing relevant chunks that use different wording for the same idea.",
  },
  {
    id: "hyde",
    name: "HyDE",
    oneLiner: "Hypothetical Document Embeddings -- ask the model to imagine an answer first.",
    problem:
      "Fixes vocabulary mismatch: a short question rarely uses the same words as the passage that answers it.",
    howItWorks:
      "The model first generates a plausible (possibly wrong) hypothetical answer to the question. That hypothetical answer -- not the question itself -- gets embedded and used for retrieval, since answers tend to share vocabulary with other answers.",
    flow: [
      { label: "Query" },
      { label: "Generate hypothetical answer", changed: true },
      { label: "Embed hypothetical answer", changed: true },
      { label: "Retrieve top-K" },
      { label: "Generate" },
    ],
    tradeoff:
      "One extra LLM call before retrieval even starts, adding latency and cost -- and if the hypothetical answer is confidently wrong in a specific way, retrieval can be pulled toward equally-wrong chunks.",
  },
  {
    id: "fusion",
    name: "RAG-Fusion",
    oneLiner: "Generate several reworded queries, retrieve for each, merge the rankings.",
    problem:
      "Fixes the single-phrasing-is-a-single-bet problem: one query embedding might just miss the right neighborhood of chunks entirely.",
    howItWorks:
      "The model rewrites the original question into 3-5 varied phrasings. Each phrasing retrieves its own top-K independently, then all the ranked lists are merged (commonly via Reciprocal Rank Fusion) into one final ranking.",
    flow: [
      { label: "Query" },
      { label: "Generate N query variants", changed: true },
      { label: "Retrieve top-K per variant", changed: true },
      { label: "Fuse rankings", changed: true },
      { label: "Generate" },
    ],
    tradeoff:
      "Meaningfully more robust to any single query's phrasing, at the cost of N times the retrieval calls and added latency -- and rank fusion needs tuning so no single variant dominates the merged result unfairly.",
  },
  {
    id: "graphrag",
    name: "GraphRAG",
    oneLiner: "Retrieve from a knowledge graph of entities and relationships, not just text chunks.",
    problem:
      "Fixes multi-hop questions naive RAG can't answer because the answer isn't in any single chunk -- it requires connecting facts across several.",
    howItWorks:
      "Documents are pre-processed into an entity-relationship graph (e.g. \"Policy X requires Approval Y\"). Retrieval traverses the graph outward from entities mentioned in the question, pulling in connected facts even if they never co-occur in one chunk of source text.",
    flow: [
      { label: "Build entity graph (offline)", changed: true },
      { label: "Query" },
      { label: "Identify entities in query", changed: true },
      { label: "Traverse graph neighborhood", changed: true },
      { label: "Generate" },
    ],
    tradeoff:
      "Handles multi-hop reasoning naive chunk retrieval structurally cannot, but the upfront graph-construction step is expensive to build and keep in sync as source documents change.",
  },
  {
    id: "self-rag",
    name: "Self-RAG",
    oneLiner: "The model critiques its own retrieval and drafts before finalizing an answer.",
    problem:
      "Fixes silent failures where retrieval returns weak or irrelevant chunks and the model answers confidently from them anyway.",
    howItWorks:
      "After retrieving and drafting an answer, the model is prompted to critique its own output against the retrieved context -- flagging unsupported claims -- and can trigger a fresh retrieval pass if the first one was inadequate, rather than emitting the answer.",
    flow: [
      { label: "Query" },
      { label: "Retrieve top-K" },
      { label: "Draft answer" },
      { label: "Self-critique against context", changed: true },
      { label: "Re-retrieve if needed", changed: true },
      { label: "Generate final answer" },
    ],
    tradeoff:
      "Catches a class of hallucination naive RAG has no mechanism to catch at all, at the cost of at least one extra full model pass per query -- and the critique step is itself an LLM call that can be wrong.",
  },
  {
    id: "agentic",
    name: "Agentic RAG",
    oneLiner: "The model decides, per question, whether and how many times to retrieve at all.",
    problem:
      "Fixes the one-shot assumption: naive RAG always retrieves exactly once, even for questions that need no retrieval, or that need several rounds of follow-up retrieval.",
    howItWorks:
      "Retrieval becomes a tool the model can call zero, one, or several times inside a bounded loop, deciding after each result whether it has enough context or needs to search again with a refined query -- e.g. looking up a policy, then looking up a term that policy references.",
    flow: [
      { label: "Query" },
      { label: "Model decides: retrieve or answer directly?", changed: true },
      { label: "Retrieve (0+ times, bounded)", changed: true },
      { label: "Model decides: enough context?", changed: true },
      { label: "Generate" },
    ],
    tradeoff:
      "The most flexible variant, able to skip retrieval entirely or chain several lookups -- but that flexibility is exactly why it needs a hard iteration cap and cost budget, or a stuck loop can retrieve indefinitely with no accuracy gain.",
  },
];
