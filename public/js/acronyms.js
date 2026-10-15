/* Acronyms, software names and technical terms are underlined in yellow on phones (not on the deck)
   and can be tapped to show what they are. Add new ones here.

   entry: { name, def, match?: [regex sources], ci?: true }
     match  extra spellings that open the same card (default: the key itself); a plural "s" is always allowed
     ci     match case-insensitively (the plain-English terms; acronyms stay case-sensitive) */

export const ACRONYMS = {
  TE: {
    name: "Transposable element",
    def: "Sequence capable of mobilising itself throughout the genome",
  },
  TSD: {
    name: "Target site duplication",
    def: "Short stretch of host DNA copied on both sides of an inserted TE",
  },
  pHMM: {
    name: "profile hidden Markov model",
    def: "A statistical model of a TE family that stores the probability of every base, insertion and deletion at each position, rather than a single consensus sequence",
  },
  RepeatModeler: {
    name: "de novo repeat discovery software",
    def: "Finds repeat families by counting exact k-mers that recur across the genome, then builds a consensus sequence for each family",
  },
  REPrise: {
    name: "de novo repeat discovery software",
    def: "Like RepeatModeler, but counts inexact k-mers (allowing mismatches), so older, more diverged copies are still grouped together",
  },
  RepeatMasker: {
    name: "repeat annotation software",
    def: "Scans a genome for sequences similar to a library of known repeat families and records where each one lies",
  },
  retrotransposition: {
    ci: true,
    name: "Retrotransposition (copy and paste)",
    def: "The TE is copied into an RNA intermediate, which is turned back into DNA and inserted at a new site. The original copy stays where it was, so the TE spreads",
  },
  transposition: {
    ci: true,
    name: "Transposition (cut and paste)",
    def: "The TE cuts itself out of its site and inserts itself somewhere else in the genome (DNA transposons)",
  },
  Dfam: {
    name: "Database of TE families",
    def: "A curated, open database of repeat families. Each family has a consensus sequence and a profile HMM (dfam.org)",
  },
  "k-mer": {
    ci: true,
    name: "k-mer",
    def: "A short word of k bases, e.g. the 5-mer TTATA. Counting how often each k-mer recurs across the genome reveals repeats",
  },
  masked: {
    ci: true,
    match: ["masking"],
    name: "Masked sequence",
    def: "Repeat sequence that is hidden from a search (lowercased in soft-masking, replaced by N in hard-masking) so it is not found again",
  },
  "satellite duplication": {
    ci: true,
    name: "Satellite duplication",
    def: "A block of sequence duplicated onto its own end, building up long arrays of near-identical repeats (satellite DNA). Not a TE, but repeat finders can still report it as a family",
  },
  "simple repeat": {
    ci: true,
    name: "Simple repeat",
    def: "A very short unit (a few bases, e.g. CACACA) repeated many times in a row. Not a TE",
  },
  "tandem repeat": {
    ci: true,
    match: ["tandem\\s*/\\s*local\\s+cluster"],
    name: "Tandem repeat",
    def: "A unit repeated head to tail, copy after copy, in one place. Satellites, simple repeats and higher order repeats are all tandem repeats",
  },
  homology: {
    ci: true,
    name: "Homology",
    def: "Similarity between sequences that comes from shared ancestry. Here, a stretch of genome that matches a TE family is taken as evidence that it is a copy of that family",
  },
  BLAST: {
    match: ["BLASTing"],
    name: "Basic Local Alignment Search Tool",
    def: "Finds regions of similarity between sequences. It starts from short exact word matches and extends them into alignments, so it needs an exact seed to begin",
  },
  orthologous: {
    ci: true,
    match: ["orthologs?"],
    name: "Orthologous",
    def: "Positions in two species that descend from the same position in their common ancestor (here, human and chimpanzee)",
  },
  "hidden Markov model": {
    ci: true,
    name: "Hidden Markov model",
    def: "A statistical model of a sequence family. For every position it stores the probability of each base plus insertion and deletion probabilities, so diverged copies can still be recognised",
  },
  "GC %": {
    ci: true,
    match: ["GC\\s*%"],
    name: "GC content",
    def: "The percentage of bases in a stretch of DNA that are G or C. It varies along the genome, and RepeatMasker uses the local GC % to pick a scoring matrix",
  },
  "family library": {
    ci: true,
    name: "Family library",
    def: "The collection of TE family models (consensus sequences or profile HMMs) that a search tool compares the genome against. Here, 1,143 Dfam families",
  },
  RMBlast: {
    name: "RepeatMasker's consensus search engine",
    def: "Aligns each family's consensus sequence to the genome (BLAST-style) and keeps matches whose alignment score passes a fixed threshold",
  },
  HMMER: {
    name: "RepeatMasker's profile HMM search engine",
    def: "Scores the genome against each family's profile HMM, with a calibrated cutoff per family. More sensitive to old, diverged copies",
  },
};

// ---- matching ----
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ciSource = (src) => src.replace(/\\.|\[[^\]]*\]|[A-Za-z]/g, (m) => (/^[A-Za-z]$/.test(m) ? `[${m.toLowerCase()}${m.toUpperCase()}]` : m));
const sourceOf = (key, e) => [...(e.match ? e.match : []), escape(key).replace(/ /g, "\\s+")];
const RULES = Object.entries(ACRONYMS).flatMap(([key, e]) =>
  sourceOf(key, e).map((src) => ({ key, re: new RegExp(`(?:${e.ci ? ciSource(src) : src})s?`, "g") })));

const isWord = (ch) => !!ch && /[A-Za-z0-9_]/.test(ch);
/** Non-overlapping term matches in `text`: [{ start, end, key }]. Whole words only; the longest match at a position wins. */
function findTerms(text) {
  const hits = [];
  for (const { key, re } of RULES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const start = m.index, end = start + m[0].length;
      if (m[0] === "") { re.lastIndex++; continue; }
      if (isWord(text[start - 1]) && isWord(text[start])) { re.lastIndex = start + 1; continue; }
      if (isWord(text[end]) && isWord(text[end - 1])) { re.lastIndex = start + 1; continue; }
      hits.push({ start, end, key });
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  let last = 0;
  for (const h of hits) if (h.start >= last) { out.push(h); last = h.end; }
  return out;
}

/** Wrap every known term in the text under `root` (HTML only, not SVG) in <abbr class="acr">. */
export function markAcronyms(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement.closest("abbr, svg, script, style, .notes") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes = [];
  while (walker.nextNode()) if (findTerms(walker.currentNode.data).length) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const { start, end, key } of findTerms(node.data)) {
      frag.append(node.data.slice(last, start));
      const abbr = document.createElement("abbr");
      abbr.className = "acr";
      abbr.dataset.acr = key;
      abbr.title = ACRONYMS[key].name;
      abbr.textContent = node.data.slice(start, end);
      frag.append(abbr);
      last = end;
    }
    frag.append(node.data.slice(last));
    node.replaceWith(frag);
  }
}
