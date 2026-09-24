import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { Stage } from "./stage";
import { type Party, chapterAt } from "./story";

// Makes the map itself show what the time panel says: the nodes taking part
// in the current process light up. Their title takes the node's color, and
// their plate keeps a soft glow (their LED). Nothing is dimmed: the others
// stay exactly as they are. The cable a message travels through lights up on
// its own (see sync.ts).

const PARTIES: Party[] = ["shell", "engram", "engines", "atlas", "sentinel", "workers", "cloud"];
const HOLD = 0.4; // how lit the plate of a node in the process stays

export function createEmphasis(
  stage: Stage,
  // The titles that belong to each party (the workers are three).
  titles: Record<Party, CSS2DObject[]>,
  // Keep a party's plate lit at this level while it takes part.
  hold: (party: Party, amount: number) => void,
): void {
  const update = (): void => {
    const involved = new Set(chapterAt(stage.clock.time()).chapter.parties);
    for (const party of PARTIES) {
      const takesPart = involved.has(party);
      for (const title of titles[party]) title.element.classList.toggle("is-active", takesPart);
      if (takesPart) hold(party, HOLD);
    }
  };
  stage.onTick(update);
  stage.clock.onChange(update);
  update();
}
