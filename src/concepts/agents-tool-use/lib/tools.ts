/**
 * The shipped toolbox (FR-003). Three non-overlapping tools, each
 * computing a genuinely correct result rather than a canned string
 * (spec.md Assumptions) -- see contracts/tool-engine-contract.md.
 */
import type { Tool } from "./types";

const OPERAND = "-?\\d+(?:\\.\\d+)?";
const CALCULATOR_PATTERN = new RegExp(`(${OPERAND})\\s*([+\\-x×*/÷])\\s*(${OPERAND})`, "i");

export const CALCULATOR: Tool = {
  id: "calculator",
  name: "Calculator",
  description: "Evaluates a two-number arithmetic expression (+, -, x, ÷) found in the question.",
  match(question) {
    const m = question.match(CALCULATOR_PATTERN);
    if (!m) return null;
    const [, aStr, opRaw, bStr] = m;
    const a = Number(aStr);
    const b = Number(bStr);
    const op = opRaw === "x" || opRaw === "×" || opRaw === "*" ? "*" : opRaw === "÷" ? "/" : opRaw;
    const result = op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b;
    return {
      reason: "the question contains a two-number arithmetic expression",
      result: `${aStr} ${opRaw} ${bStr} = ${result}`,
    };
  },
};

type DistanceUnit = "km" | "mi";
type MassUnit = "kg" | "lb";
type TemperatureUnit = "c" | "f";
type NormalizedUnit = DistanceUnit | MassUnit | TemperatureUnit;

const UNIT_CATEGORY: Record<NormalizedUnit, "distance" | "mass" | "temperature"> = {
  km: "distance",
  mi: "distance",
  kg: "mass",
  lb: "mass",
  c: "temperature",
  f: "temperature",
};

function normalizeUnit(raw: string): NormalizedUnit | null {
  const u = raw.toLowerCase().replace(/^°/, "");
  if (u === "kilometer" || u === "kilometers" || u === "km") return "km";
  if (u === "mile" || u === "miles" || u === "mi") return "mi";
  if (u === "kilogram" || u === "kilograms" || u === "kg") return "kg";
  if (u === "pound" || u === "pounds" || u === "lb" || u === "lbs") return "lb";
  if (u === "celsius" || u === "c") return "c";
  if (u === "fahrenheit" || u === "f") return "f";
  return null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Real conversion math via a small fixed table -- null if the two units aren't the same kind of measurement (e.g. km to kg). */
function convert(value: number, fromRaw: string, toRaw: string): number | null {
  const from = normalizeUnit(fromRaw);
  const to = normalizeUnit(toRaw);
  if (!from || !to) return null;
  if (UNIT_CATEGORY[from] !== UNIT_CATEGORY[to]) return null;
  if (from === to) return round2(value);
  if (from === "km" && to === "mi") return round2(value * 0.621371);
  if (from === "mi" && to === "km") return round2(value / 0.621371);
  if (from === "kg" && to === "lb") return round2(value * 2.20462);
  if (from === "lb" && to === "kg") return round2(value / 2.20462);
  if (from === "c" && to === "f") return round2((value * 9) / 5 + 32);
  if (from === "f" && to === "c") return round2(((value - 32) * 5) / 9);
  return null;
}

const UNIT_WORD = "kilometers?|km|miles?|mi|kilograms?|kg|pounds?|lbs?|celsius|°?c|fahrenheit|°?f";
const UNIT_CONVERTER_PATTERN = new RegExp(
  `(${OPERAND})\\s*(${UNIT_WORD})\\s+(?:to|in)\\s+(${UNIT_WORD})`,
  "i",
);

export const UNIT_CONVERTER: Tool = {
  id: "unit-converter",
  name: "Unit Converter",
  description: "Converts a number between two recognized units (kilometers/miles, kilograms/pounds, Celsius/Fahrenheit).",
  match(question) {
    const m = question.match(UNIT_CONVERTER_PATTERN);
    if (!m) return null;
    const converted = convert(Number(m[1]), m[2], m[3]);
    if (converted === null) return null;
    return {
      reason: "the question asks to convert a number between two recognized units",
      result: `${m[1]} ${m[2]} is approximately ${converted} ${m[3]}`,
    };
  },
};

export interface Fact {
  phrase: string;
  answer: string;
}

/** Small, fixed, shipped fact set (spec.md Assumptions) -- not a live lookup. */
export const FACTS: Fact[] = [
  { phrase: "capital of france", answer: "Paris" },
  { phrase: "capital of japan", answer: "Tokyo" },
  { phrase: "capital of italy", answer: "Rome" },
  { phrase: "largest planet", answer: "Jupiter is the largest planet in the solar system." },
  { phrase: "speed of light", answer: "The speed of light is approximately 299,792 kilometers per second." },
  { phrase: "author of hamlet", answer: "William Shakespeare wrote Hamlet." },
];

export const KNOWLEDGE_LOOKUP: Tool = {
  id: "knowledge-lookup",
  name: "Knowledge Lookup",
  description: "Looks up an answer from a small, fixed set of general-knowledge facts.",
  match(question) {
    const q = question.toLowerCase();
    const hit = FACTS.find(({ phrase }) => q.includes(phrase));
    if (!hit) return null;
    return {
      reason: `the question matches a known fact: "${hit.phrase}"`,
      result: hit.answer,
    };
  },
};

/** Fixed declaration order == tie-break order (research.md). */
export const DEFAULT_TOOLBOX: Tool[] = [CALCULATOR, UNIT_CONVERTER, KNOWLEDGE_LOOKUP];
