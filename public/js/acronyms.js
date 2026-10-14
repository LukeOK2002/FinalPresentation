/* Acronyms and software names are underlined in yellow on phones (not on the deck)
   and can be tapped to show what they are. Add new ones here. */

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
};

const PATTERN = new RegExp(`\\b(${Object.keys(ACRONYMS).join("|")})(s?)\\b`, "g");
const HAS = new RegExp(PATTERN.source); // non-global: .test() without lastIndex state

/** Wrap every acronym in the text under `root` (HTML only, not SVG) in <abbr class="acr">. */
export function markAcronyms(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement.closest("abbr, svg, script, style, .notes") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes = [];
  while (walker.nextNode()) if (HAS.test(walker.currentNode.data)) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    let last = 0;
    node.data.replace(PATTERN, (match, key, _s, offset) => {
      frag.append(node.data.slice(last, offset));
      const abbr = document.createElement("abbr");
      abbr.className = "acr";
      abbr.dataset.acr = key;
      abbr.title = ACRONYMS[key].name;
      abbr.textContent = match;
      frag.append(abbr);
      last = offset + match.length;
      return match;
    });
    frag.append(node.data.slice(last));
    node.replaceWith(frag);
  }
}
