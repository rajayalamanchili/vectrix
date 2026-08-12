/**
 * Shipped sample questions (FR-007). See
 * specs/005-agents-tool-use/data-model.md's own note: "division"'s text
 * uses the literal `/` symbol, not the word "divided by" -- Calculator's
 * regex only recognizes a symbolic operator, not natural-language
 * operator words.
 */

export interface SampleQuestion {
  id: string;
  text: string;
  /** Which tool this question is curated to demonstrate, or null for the no-tool-fits case. Documentation only -- never read by the matching engine itself. */
  expectedToolId: string | null;
}

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  { id: "division", text: "What is 128 / 4?", expectedToolId: "calculator" },
  { id: "distance", text: "Convert 5 kilometers to miles", expectedToolId: "unit-converter" },
  { id: "capital", text: "What is the capital of France?", expectedToolId: "knowledge-lookup" },
  { id: "no-fit", text: "What's the weather like on Mars today?", expectedToolId: null },
];
