/* Acronyms are underlined in yellow everywhere; on phones they can be tapped
   to show what they stand for. Add new ones here. */

export const ACRONYMS = {
  TE: {
    name: "Transposable element",
    def: "Sequence capable of mobilising itself throughout the genome",
  },
  TSD: {
    name: "Target site duplication",
    def: "Short stretch of host DNA copied on both sides of an inserted TE",
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
