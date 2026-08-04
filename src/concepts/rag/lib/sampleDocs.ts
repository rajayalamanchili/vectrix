export interface SampleDoc {
  id: string;
  title: string;
  text: string;
  sampleQueries: string[];
}

export const sampleDocs: SampleDoc[] = [
  {
    id: "coffee",
    title: "Home Coffee Brewing Guide",
    sampleQueries: [
      "What grind size should I use for a French press?",
      "How long should espresso extraction take?",
      "Why does my pour-over taste sour?",
    ],
    text: `Pour-over brewing relies on a medium-fine grind and water just off the boil, around 200 degrees Fahrenheit. Pour in slow, even circles to keep the grounds evenly saturated, and aim for a total brew time of two and a half to three and a half minutes. A sour, thin cup usually means the coffee was under-extracted -- try a finer grind or a longer pour.

French press brewing calls for a much coarser grind, similar to breadcrumbs, since the metal filter lets fine particles through. Steep for four minutes before pressing the plunger down slowly. A muddy or gritty cup usually means the grind was too fine for the mesh filter, or the plunger was pressed too quickly.

Espresso is brewed under high pressure through a fine, compact grind, extracting about 36 to 40 grams of liquid from 18 grams of coffee in 25 to 30 seconds. A shot pulled too fast tastes sour and thin; a shot pulled too slow tastes bitter and over-extracted. Grind size is the main lever for adjusting extraction time.

Cold brew uses a very coarse grind steeped in cold or room-temperature water for 12 to 24 hours, producing a low-acid, naturally sweet concentrate meant to be diluted before drinking. Because there's no heat involved, cold brew extracts differently than any hot-brewing method and tolerates a much longer steep time without turning bitter.

Water quality matters across every method: water that's too soft under-extracts and tastes flat, while water that's too hard over-extracts and tastes chalky or bitter. Filtered water with moderate mineral content is generally recommended for all four brewing methods above.`,
  },
  {
    id: "onboarding",
    title: "Employee Benefits Handbook Excerpt",
    sampleQueries: [
      "How many vacation days do new employees get?",
      "What is the 401k matching policy?",
      "Is parental leave paid?",
    ],
    text: `New full-time employees accrue 15 vacation days per year during their first two years, increasing to 20 days starting in year three and 25 days starting in year six. Vacation accrues monthly and unused days roll over up to a maximum of 10 days into the following year.

The company matches 401k contributions dollar-for-dollar up to 4 percent of an employee's salary, with immediate vesting -- there is no waiting period before matched funds belong to the employee. Enrollment is automatic at a 3 percent contribution rate unless an employee opts out or changes their rate within the first 30 days.

Parental leave provides 16 weeks of fully paid leave for the birth parent and 8 weeks of fully paid leave for a non-birth parent, available for births, adoptions, and foster placements. Leave can be taken in one continuous block or split into two blocks within the first year after the child arrives.

Health insurance coverage begins on an employee's first day, with no waiting period. The company covers 90 percent of the premium for employee-only coverage and 70 percent of the premium for coverage that includes dependents.

Sick leave is separate from vacation time: employees accrue 1 sick day per month, up to 12 per year, and unused sick days do not roll over or pay out at termination.`,
  },
];

export interface Chunk {
  id: string;
  text: string;
  startWord: number;
  endWord: number;
}

/** Splits text into overlapping word-count chunks -- the simplest real chunking strategy. */
export function chunkText(text: string, chunkSize: number, overlap: number): Chunk[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const chunks: Chunk[] = [];
  let start = 0;
  let idx = 0;
  const step = Math.max(1, chunkSize - overlap);

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push({
      id: `chunk-${idx}`,
      text: words.slice(start, end).join(" "),
      startWord: start,
      endWord: end,
    });
    idx += 1;
    if (end >= words.length) break;
    start += step;
  }
  return chunks;
}
