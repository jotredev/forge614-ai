// Makes a plate's LED behave like a real one: it snaps on the moment a
// message arrives and fades out slowly, so you can still see where the last
// message went. Arrivals close together do not add up; the strongest wins.

export type Led = {
  // An arrival flash (0 to 1) reported by a cable that ends at this node.
  hit(amount: number): void;
  // Call once per tick, after every cable has reported.
  update(seconds: number): void;
};

const FADE = 1.4; // seconds a full glow takes to go out

export function createLed(apply: (amount: number) => void): Led {
  let level = 0;
  let shown = 0;
  let last = 0;
  return {
    hit: (amount) => {
      if (amount > level) level = amount;
    },
    update: (seconds) => {
      const dt = Math.max(0, seconds - last);
      last = seconds;
      shown = Math.max(level, shown - dt / FADE);
      level = 0;
      apply(shown);
    },
  };
}
