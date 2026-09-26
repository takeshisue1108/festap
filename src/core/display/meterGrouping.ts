// Spec §7 / plan §6.6: one big clap for beat 1, then small claps — grouped when there are many.

export interface SmallClapIcon {
  count: number; // beats this icon stands for
  labelled: boolean; // show the count as a number
}

export interface MeterGlyphs {
  meter: number;
  small: SmallClapIcon[];
}

const GROUP_SIZES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export function meterGrouping(meter: number, maxIcons = 7): MeterGlyphs {
  const rest = Math.max(0, Math.floor(meter) - 1);
  if (rest <= maxIcons) {
    return { meter, small: Array.from({ length: rest }, () => ({ count: 1, labelled: false })) };
  }
  let g = GROUP_SIZES.find((size) => Math.ceil(rest / size) <= maxIcons);
  if (g === undefined) g = Math.ceil(rest / maxIcons);
  const full = Math.floor(rest / g);
  const small: SmallClapIcon[] = Array.from({ length: full }, () => ({ count: g, labelled: true }));
  const remainder = rest - full * g;
  if (remainder > 0) small.push({ count: remainder, labelled: true });
  return { meter, small };
}
