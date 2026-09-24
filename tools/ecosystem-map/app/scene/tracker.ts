import type { Stage } from "./stage";
import { CHAPTERS, type Chapter, type Palette, chapterAt, stepFrom } from "./story";
import { CYCLE } from "./timeline";

// The block in the bottom-left corner that says which process the system is
// running, and moves on to the next by itself. Each process explains itself:
// its name, what it is for in one line, and the steps it goes through as a
// list of objectives, like a mission in a game: the ones already done are
// checked, the one under way is bright and marked with a pulsing dot, and the
// rest are dim. A row of thin bars, one per process, fills as they are done.
// It has no box: it floats over the map like the titles of the nodes. Under it
// go the counters of what the map costs to run (see hud.ts).
//
// It has no controls on screen. Quietly, Space pauses and resumes, and the
// left and right arrows go to the previous and next process.

export type Tracker = {
  // Where the counters go: under the process.
  metrics: HTMLElement;
  dispose(): void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const wrap = (seconds: number): number => ((seconds % CYCLE) + CYCLE) % CYCLE;

export function createTracker(stage: Stage, palette: Palette): Tracker {
  const clock = stage.clock;
  const leadColor = (index: number): string => palette[CHAPTERS[index]!.parties[0]!].color;

  const stack = el("div", "stack");
  stack.setAttribute("aria-label", "Proceso en ejecución y rendimiento");

  // --- The process ---------------------------------------------------------
  const card = el("section", "tracker");
  card.setAttribute("aria-label", "Proceso en ejecución");

  const top = el("div", "tracker__top");
  const count = el("span", "tracker__count");
  const state = el("span", "tracker__state");
  top.append(count, state);
  const name = el("h2", "tracker__name");
  name.setAttribute("aria-live", "polite");
  const goal = el("p", "tracker__goal");
  const steps = el("ol", "tracker__steps");
  const pips = el("div", "tracker__pips");
  const pipFills = CHAPTERS.map((chapter, i) => {
    const pip = el("i", "tracker__pip");
    pip.style.setProperty("--c", leadColor(i));
    pip.style.flexGrow = String(chapter.to - chapter.from);
    const fill = el("i", "tracker__fill");
    pip.append(fill);
    pips.append(pip);
    return fill;
  });
  card.append(top, name, goal, steps, pips);

  // --- The counters (filled by hud.ts) -------------------------------------
  const metrics = el("section", "stack__metrics");
  metrics.setAttribute("aria-label", "Rendimiento del mapa");

  stack.append(card, metrics);
  document.body.append(stack);

  // --- What changes as time goes by ----------------------------------------
  let shownChapter = -1;
  let stepItems: HTMLElement[] = [];

  // The steps of a process, each marked in the color of whoever acts.
  const renderSteps = (chapter: Chapter): void => {
    stepItems = chapter.steps.map((step) => {
      const item = el("li", "tracker__item");
      item.style.setProperty("--c", palette[step.by].color);
      item.append(el("i", "tracker__mark"), el("span", "tracker__text", step.text));
      return item;
    });
    steps.replaceChildren(...stepItems);
  };

  const refresh = (): void => {
    const t = wrap(clock.time());
    const here = chapterAt(t);
    card.style.setProperty("--accent", leadColor(here.index));

    if (here.index !== shownChapter) {
      const first = shownChapter === -1;
      shownChapter = here.index;
      count.textContent = `Proceso ${here.index + 1} de ${CHAPTERS.length}`;
      name.textContent = here.chapter.name;
      goal.textContent = here.chapter.goal;
      renderSteps(here.chapter);
      // A new process: the name comes in.
      if (!first) {
        card.classList.remove("is-entering");
        void card.offsetWidth; // restart the animation
        card.classList.add("is-entering");
      }
    }

    stepItems.forEach((item, i) => {
      item.classList.toggle("is-done", i < here.step);
      item.classList.toggle("is-current", i === here.step);
    });

    pipFills.forEach((fill, i) => {
      const done = i < here.index ? 1 : i === here.index ? here.progress : 0;
      fill.style.transform = `scaleX(${done.toFixed(3)})`;
      fill.parentElement!.classList.toggle("is-current", i === here.index);
    });

    const playing = clock.isPlaying();
    card.classList.toggle("is-paused", !playing);
    state.textContent = playing ? "En curso" : "En pausa";
  };
  stage.onTick(refresh);
  clock.onChange(refresh);
  refresh();

  // --- Quiet keys ----------------------------------------------------------
  const inField = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement && (target.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement);
  const onKey = (event: KeyboardEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey || inField(event.target)) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (event.key === " ") {
      // A focused button takes the space bar for itself.
      if (target && (target.tagName === "BUTTON" || target.closest("a"))) return;
      event.preventDefault();
      if (clock.isPlaying()) clock.pause();
      else clock.play();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      // Leave the arrows to a panel that scrolls with them.
      if (target?.closest(".info__scroll")) return;
      event.preventDefault();
      clock.seek(stepFrom(clock.time(), event.key === "ArrowLeft" ? -1 : 1));
    }
  };
  window.addEventListener("keydown", onKey);

  return {
    metrics,
    dispose() {
      window.removeEventListener("keydown", onKey);
      stack.remove();
    },
  };
}
