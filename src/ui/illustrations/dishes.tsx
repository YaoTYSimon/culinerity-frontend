import { Bowl, f, Frame, Glass, Ground, Plate, s, type IllustrationProps } from './parts';

type P = IllustrationProps;

/* ---------- Cravings ---------- */

export const Burger = (p: P) => (
  <Frame {...p}>
    <Plate />
    <path d="M12 41h40a4 4 0 0 1-4 5H16a4 4 0 0 1-4-5z" className={f.bunD} />
    <rect x="10" y="34" width="44" height="8" rx="4" className={f.meat} />
    <path d="M12 34h40l-5 7-6-4-6 5-6-5-6 4z" className={f.gold} />
    <path d="M10 31q4-4 8 0t8 0 8 0 8 0 8 0v4H10z" className={f.leaf} />
    <ellipse cx="25" cy="29" rx="7" ry="2.5" className={f.red} />
    <ellipse cx="41" cy="29" rx="7" ry="2.5" className={f.red} />
    <path d="M10 27a22 17 0 0 1 44 0z" className={f.bun} />
    <path d="M12 27a20 15 0 0 1 40 0z" className="fill-food-bun-d/25" />
    <g className={f.cream}>
      <ellipse cx="24" cy="17" rx="2" ry="1" /><ellipse cx="32" cy="14" rx="2" ry="1" /><ellipse cx="40" cy="17" rx="2" ry="1" />
      <ellipse cx="29" cy="21" rx="2" ry="1" /><ellipse cx="36" cy="22" rx="2" ry="1" /><ellipse cx="19" cy="22" rx="2" ry="1" />
    </g>
  </Frame>
);

export const HotChips = (p: P) => (
  <Frame {...p}>
    <Ground rx={22} />
    {[[20, 18, -8], [26, 12, -3], [32, 10, 0], [38, 13, 4], [44, 19, 9], [29, 20, 2], [36, 22, -2]].map(([x, y, r]) => (
      <rect key={`${x}${y}`} x={x - 3} y={y} width="6" height="26" rx="2" transform={`rotate(${r} ${x} 40)`} className={f.gold} />
    ))}
    {[[20, 18, -8], [32, 10, 0], [44, 19, 9]].map(([x, y, r]) => (
      <rect key={`d${x}`} x={x + 0.5} y={y} width="2.5" height="26" rx="1.2" transform={`rotate(${r} ${x} 40)`} className={f.bun} />
    ))}
    <path d="M14 36h36l-3 20H17z" className={f.red} />
    <path d="M14 36h36l-.6 4H14.600z" className={f.redD} />
    <path d="M22 44h20l-.6 5H22.600z" className={f.cream} />
    <circle cx="32" cy="46.500" r="2" className={f.red} />
  </Frame>
);

export const BubbleTea = (p: P) => (
  <Frame {...p}>
    <Ground rx={16} />
    <rect x="35" y="4" width="4" height="22" rx="2" transform="rotate(9 37 15)" className={f.rose} />
    <path d="M19 21h26l-4 35H23z" className="fill-food-cream/60" />
    <path d="M20.200 31h23.600l-2.800 25H23z" className={f.tea} />
    <path d="M20.200 31h23.600l-.4 3.400H20.600z" className="fill-food-cream-d/70" />
    <rect x="17" y="17" width="30" height="6" rx="3" className={f.creamD} />
    <g className={f.choc}>
      {[[26, 52], [32, 53], [38, 52], [29, 48], [35, 48], [32, 44]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.700" />)}
    </g>
    <path d="M24 28l-1.500 20" className="stroke-background/60" strokeWidth="2" strokeLinecap="round" fill="none" />
  </Frame>
);

export const InstantNoodles = (p: P) => (
  <Frame {...p}>
    <Ground rx={18} />
    <g className="fill-none" strokeWidth="2.400" strokeLinecap="round">
      <path d="M20 26c3-10 8-10 10-3s7 6 9-2 6-3 6 3" className={s.gold} />
      <path d="M18 28c4-8 10-4 12 0s8 2 10-4" className={s.bunD} />
    </g>
    <path d="M14 26h36l-6 31H20z" className={f.red} />
    <path d="M16.200 36h31.600l-1.200 8H17.400z" className={f.cream} />
    <path d="M14 26h36l-.6 3.500H14.600z" className={f.redD} />
    <ellipse cx="32" cy="26" rx="18" ry="3" className={f.creamD} />
    <g className="fill-none stroke-food-cream-d" strokeWidth="1.600" strokeLinecap="round">
      <path d="M24 16c-2-3 2-4 0-7" /><path d="M32 15c-2-3 2-4 0-7" /><path d="M40 16c-2-3 2-4 0-7" />
    </g>
  </Frame>
);

export const Pizza = (p: P) => (
  <Frame {...p}>
    <Ground rx={24} />
    <path d="M32 58L6 20q26-12 52 0z" className={f.gold} />
    <path d="M6 20q26-12 52 0l-2.500 3.600q-23.500-10-47 0z" className={f.bun} />
    <circle cx="22" cy="28" r="5" className={f.red} /><circle cx="38" cy="27" r="5" className={f.red} />
    <circle cx="31" cy="39" r="4.500" className={f.red} /><circle cx="32" cy="48" r="3" className={f.red} />
    <g className={f.redD}><circle cx="21" cy="27" r="1" /><circle cx="24" cy="29" r="1" /><circle cx="37" cy="26" r="1" /><circle cx="40" cy="28" r="1" /><circle cx="30" cy="38" r="1" /><circle cx="33" cy="40" r="1" /></g>
    <path d="M30 30c3-4 7-3 7 0-3 3-6 3-7 0z" className={f.leaf} />
  </Frame>
);

export const Chocolate = (p: P) => (
  <Frame {...p}>
    <Ground rx={20} />
    <rect x="15" y="8" width="34" height="46" rx="3" className={f.choc} />
    {[0, 1, 2].map((c) => [0, 1, 2].map((r) => (
      <rect key={`${c}${r}`} x={17.500 + c * 10.600} y={10.500 + r * 9.600} width="8.600" height="7.600" rx="1.500" className="fill-food-meat" />
    )))}
    <path d="M13 36h38v20H13z" className={f.red} />
    <path d="M13 36h38l-2 5H15z" className={f.redD} />
    <rect x="20" y="45" width="24" height="5" rx="2.500" className={f.cream} />
  </Frame>
);

const Drumstick = ({ x = 0, y = 0, r = 0, k = 1 }: { x?: number; y?: number; r?: number; k?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r} 32 32) scale(${k})`}>
    <path d="M25 36L9 52" className="fill-none stroke-food-cream" strokeWidth="6" strokeLinecap="round" />
    <path d="M25 36L9 52" className="fill-none stroke-food-cream-d" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="6.500" cy="51" r="3.800" className={f.cream} /><circle cx="10" cy="55" r="3.800" className={f.cream} />
    <path d="M13 20C13 7 33 3 46 11c11 7 11 22 1 29-9 6-19 3-25-2-4-4-9-10-9-18z" className={f.bunD} />
    <path d="M16 20C17 11 31 7 41 12c-9 1-14 6-16 14-3 2-7-1-9-6z" className={f.bun} />
    <g className={f.gold}><circle cx="38" cy="22" r="1.800" /><circle cx="43" cy="31" r="1.800" /><circle cx="31" cy="33" r="1.800" /><circle cx="25" cy="16" r="1.400" /></g>
    <path d="M22 38c4 3 11 5 17 1" className="fill-none stroke-food-meat" strokeWidth="1.500" strokeLinecap="round" opacity="0.5" />
  </g>
);

export const FriedChicken = (p: P) => (
  <Frame {...p}>
    <Ground rx={24} />
    <Drumstick />
    <path d="M44 48c3-3 8-2 9 2s-5 6-9 3z" className={f.red} />
  </Frame>
);

const Wrap = ({ filling, ...p }: P & { filling: 'meat' | 'falafel' | 'chicken' }) => (
  <Frame {...p}>
    <Ground rx={20} />
    <path d="M19 33h26l-4 22a3 3 0 0 1-3 2.500H26a3 3 0 0 1-3-2.500z" className={f.red} />
    <path d="M19 33h26l-.8 4.500H19.800z" className={f.redD} />
    <rect x="26" y="44" width="12" height="5" rx="2.500" className={f.cream} />
    <path d="M16 16q16-6 32 0l-3 19H19z" className={f.cream} />
    <path d="M24 17l5 18" className="fill-none stroke-food-cream-d" strokeWidth="1.500" strokeLinecap="round" />
    <path d="M17 15q3-9 7-5 2-8 7-4 3-6 8-1 5-3 7 4 3 3 1 6-15 6-30 0z" className={f.leaf} />
    {filling === 'falafel' ? (
      <g className={f.bunD}><circle cx="25" cy="13" r="4.500" /><circle cx="34" cy="10" r="4.500" /><circle cx="42" cy="14" r="4" /></g>
    ) : filling === 'chicken' ? (
      <g className={f.gold}><rect x="21" y="8" width="11" height="6" rx="3" /><rect x="33" y="9" width="11" height="6" rx="3" /></g>
    ) : (
      <g className={f.meat}><rect x="21" y="8" width="11" height="6" rx="3" /><rect x="33" y="9" width="11" height="6" rx="3" /></g>
    )}
    <circle cx="30" cy="9" r="2.200" className={f.rose} /><circle cx="40" cy="8" r="2.200" className={f.rose} /><circle cx="27" cy="14" r="2" className={f.red} />
  </Frame>
);

export const Kebab = (p: P) => <Wrap filling="meat" {...p} />;
export const FalafelWrap = (p: P) => <Wrap filling="falafel" {...p} />;
export const ChickenKebabHome = (p: P) => <Wrap filling="chicken" {...p} />;

export const Pastry = (p: P) => (
  <Frame {...p}>
    <Ground rx={24} />
    <ellipse cx="5.8" cy="45.5" rx="8" ry="6" transform="rotate(-76 5.8 45.5)" className={f.gold} />
    <ellipse cx="13.2" cy="32.6" rx="11" ry="8" transform="rotate(-44 13.2 32.6)" className={f.bunD} />
    <ellipse cx="25.5" cy="25.8" rx="14" ry="10" transform="rotate(-14 25.5 25.8)" className={f.gold} />
    <ellipse cx="38.5" cy="25.8" rx="14" ry="10" transform="rotate(14 38.5 25.8)" className={f.bunD} />
    <ellipse cx="50.8" cy="32.6" rx="11" ry="8" transform="rotate(44 50.8 32.6)" className={f.gold} />
    <ellipse cx="58.2" cy="45.5" rx="8" ry="6" transform="rotate(76 58.2 45.5)" className={f.bunD} />
    <ellipse cx="13.2" cy="29.4" rx="4.0" ry="1.6" transform="rotate(-44 13.2 29.4)" className="fill-food-cream/60" />
    <ellipse cx="25.5" cy="21.4" rx="5.5" ry="1.6" transform="rotate(-14 25.5 21.4)" className="fill-food-cream/60" />
    <ellipse cx="38.5" cy="21.4" rx="5.5" ry="1.6" transform="rotate(14 38.5 21.4)" className="fill-food-cream/60" />
    <ellipse cx="50.8" cy="29.4" rx="4.0" ry="1.6" transform="rotate(44 50.8 29.4)" className="fill-food-cream/60" />
  </Frame>
);

export const SoftDrink = (p: P) => (
  <Frame {...p}>
    <Ground rx={14} />
    <rect x="27" y="6" width="10" height="6" rx="2" className={f.choc} />
    <path d="M27 12h10v6c0 3 9 5 9 12v22a5 5 0 0 1-5 5H23a5 5 0 0 1-5-5V30c0-7 9-9 9-12z" className={f.red} />
    <path d="M18 34h28v12H18z" className={f.cream} />
    <path d="M22 40h20" className="stroke-food-red" strokeWidth="3" strokeLinecap="round" />
    <path d="M22 22c0 4-3 6-3 10" className="stroke-background/50" strokeWidth="2" strokeLinecap="round" fill="none" />
    <circle cx="40" cy="26" r="1.500" className="fill-background/60" /><circle cx="36" cy="30" r="1" className="fill-background/60" />
  </Frame>
);

/* ---------- Home swaps ---------- */

export const SmashBurger = (p: P) => (
  <Frame {...p}>
    <Plate />
    <path d="M14 42h36a4 4 0 0 1-4 5H18a4 4 0 0 1-4-5z" className={f.bunD} />
    <path d="M8 36q3-3 6 0t6 0 6 0 6 0 6 0 6 0 6-1v6H8z" className={f.meat} />
    <path d="M10 36h44l-3 9-6-4-6 6-6-6-7 5-6-4z" className={f.gold} />
    <circle cx="20" cy="32" r="3.400" className={f.leaf} /><circle cx="44" cy="32" r="3.400" className={f.leaf} />
    <path d="M16 30a16 11 0 0 1 32 0z" className={f.bun} />
    <ellipse cx="26" cy="23" rx="2" ry="1" className={f.cream} /><ellipse cx="35" cy="21" rx="2" ry="1" className={f.cream} />
  </Frame>
);

export const ChickenSaladRoll = (p: P) => (
  <Frame {...p}>
    <Plate />
    <rect x="8" y="38" width="48" height="10" rx="5" className={f.bunD} />
    <path d="M9 38q3-5 6 0t6 0 6 0 6 0 6 0 6 0 6 0v2H9z" className={f.leaf} />
    <rect x="14" y="33" width="14" height="6" rx="3" className={f.cream} /><rect x="30" y="32" width="14" height="6" rx="3" className={f.cream} />
    <circle cx="26" cy="36" r="3" className={f.red} /><circle cx="46" cy="35" r="3" className={f.red} />
    <path d="M8 34a24 12 0 0 1 48 0z" className={f.bun} />
    <ellipse cx="28" cy="25" rx="2" ry="1" className={f.cream} /><ellipse cx="38" cy="24" rx="2" ry="1" className={f.cream} />
  </Frame>
);

export const OvenWedges = (p: P) => (
  <Frame {...p}>
    <rect x="6" y="34" width="52" height="20" rx="4" className={f.blue} />
    <rect x="9" y="36" width="46" height="14" rx="3" className="fill-background/30" />
    {[[14, 38, -10], [24, 36, 6], [35, 38, -6], [45, 36, 10], [29, 42, 80]].map(([x, y, r]) => (
      <g key={`${x}${y}`} transform={`rotate(${r} ${x + 5} ${y + 4})`}>
        <path d={`M${x} ${y}q5 -7 10 0q-1 9 -5 9q-4 0 -5 -9z`} className={f.gold} />
        <path d={`M${x} ${y}q5 -7 10 0l-1 2q-4 -4 -8 0z`} className={f.bun} />
      </g>
    ))}
    <path d="M44 22l8-10M47 24l9-7M42 26l6-12" className={s.leafD} strokeWidth="2" strokeLinecap="round" fill="none" />
  </Frame>
);

export const RoastChickpeas = (p: P) => (
  <Frame {...p}>
    <Bowl />
    <ellipse cx="32" cy="36" rx="24" ry="4.500" className={f.bunD} />
    {[[18, 33], [26, 31], [34, 30], [42, 32], [49, 35], [22, 37], [30, 35], [38, 35], [44, 38], [15, 37], [28, 28], [37, 27], [33, 33]].map(([x, y]) => (
      <g key={`${x}${y}`}><circle cx={x} cy={y} r="4" className={f.bun} /><circle cx={x - 1} cy={y - 1} r="1.400" className={f.gold} /></g>
    ))}
  </Frame>
);

export const HomemadeMilkTea = (p: P) => (
  <Frame {...p}>
    <Ground rx={20} />
    <path d="M46 28c10-2 10 14 0 14" className="fill-none stroke-food-cream-d" strokeWidth="4" strokeLinecap="round" />
    <path d="M14 24h32l-2 26a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" className={f.cream} />
    <ellipse cx="30" cy="24" rx="16" ry="4" className={f.tea} />
    <path d="M16 38h28l-.5 6h-27z" className={f.rose} />
    <g className="fill-none stroke-food-cream-d" strokeWidth="1.600" strokeLinecap="round"><path d="M24 14c-2-3 2-4 0-7" /><path d="M32 13c-2-3 2-4 0-7" /></g>
    <rect x="36" y="12" width="7" height="6" rx="1.500" transform="rotate(12 40 15)" className={f.rose} />
  </Frame>
);

export const FruitIcedTea = (p: P) => (
  <Frame {...p}>
    <Glass fill="fill-food-tea/80" level={20}>
      <rect x="25" y="26" width="8" height="8" rx="1.500" transform="rotate(-12 29 30)" className="fill-background/70" />
      <rect x="32" y="36" width="7" height="7" rx="1.500" transform="rotate(10 35 40)" className="fill-background/70" />
      <circle cx="30" cy="48" r="4" className={f.red} /><circle cx="37" cy="46" r="3" className={f.rose} />
    </Glass>
    <rect x="35" y="2" width="3.500" height="26" rx="1.700" transform="rotate(10 37 15)" className={f.leaf} />
    <circle cx="22" cy="14" r="7" className={f.gold} /><circle cx="22" cy="14" r="5.200" className={f.cream} />
    <path d="M22 14V9M22 14l4.500-2.500M22 14l4.500 2.500M22 14l-4.500 2.500M22 14l-4.500-2.500" className="stroke-food-gold" strokeWidth="1" />
  </Frame>
);

export const EggNoodleStirfry = (p: P) => (
  <Frame {...p}>
    <Bowl />
    <ellipse cx="32" cy="36" rx="24" ry="4.500" className={f.bunD} />
    <g className="fill-none" strokeWidth="3" strokeLinecap="round">
      <path d="M14 34c4-8 8 4 12-4s8 4 12-4 8 4 12-2" className={s.gold} />
      <path d="M16 38c5-6 8 3 13-3s9 3 13-2" className={s.cream} />
    </g>
    <circle cx="22" cy="28" r="3" className={f.leaf} /><circle cx="40" cy="27" r="3" className={f.leaf} />
    <rect x="29" y="25" width="6" height="4" rx="2" className={f.red} /><rect x="45" y="31" width="5" height="3.500" rx="1.700" className={f.red} />
    <path d="M44 6l-10 24M50 8L38 30" className="stroke-food-meat" strokeWidth="2" strokeLinecap="round" fill="none" />
  </Frame>
);

export const EggFriedRice = (p: P) => (
  <Frame {...p}>
    <Bowl />
    <path d="M10 36q4-14 22-14t22 14z" className={f.cream} />
    <g className={f.gold}><circle cx="20" cy="31" r="2" /><circle cx="30" cy="27" r="2" /><circle cx="42" cy="30" r="2" /><circle cx="36" cy="33" r="2" /><circle cx="26" cy="34" r="2" /></g>
    <g className={f.leaf}><circle cx="24" cy="28" r="1.800" /><circle cx="38" cy="27" r="1.800" /><circle cx="46" cy="34" r="1.800" /><circle cx="16" cy="34" r="1.800" /></g>
    <g className={f.red}><rect x="31" y="30" width="3.500" height="3.500" rx="1" /><rect x="19" y="34" width="3.500" height="3.500" rx="1" /></g>
    <path d="M26 22c0-5 6-8 11-5s4 8-1 9-10 0-10-4z" className={f.white} />
    <circle cx="32" cy="21" r="3.500" className={f.gold} />
  </Frame>
);

export const TurkishBreadPizza = (p: P) => (
  <Frame {...p}>
    <Ground rx={26} />
    <ellipse cx="32" cy="38" rx="28" ry="14" transform="rotate(-8 32 38)" className={f.bunD} />
    <ellipse cx="32" cy="37" rx="25" ry="11.500" transform="rotate(-8 32 37)" className={f.red} />
    <g className={f.gold}><ellipse cx="22" cy="36" rx="7" ry="3.500" /><ellipse cx="38" cy="34" rx="8" ry="4" /><ellipse cx="46" cy="40" rx="5" ry="3" /><ellipse cx="30" cy="43" rx="6" ry="3" /></g>
    <g className={f.choc}><circle cx="28" cy="32" r="2" /><circle cx="42" cy="38" r="2" /><circle cx="18" cy="41" r="2" /></g>
    <path d="M33 30c3-3 6-2 6 0-3 2-5 2-6 0z" className={f.leaf} />
  </Frame>
);

export const SpaghettiPomodoro = (p: P) => (
  <Frame {...p}>
    <Plate />
    <g className="fill-none" strokeWidth="3" strokeLinecap="round">
      <ellipse cx="32" cy="42" rx="19" ry="6.500" className={s.gold} />
      <ellipse cx="32" cy="38" rx="14" ry="5" className={s.cream} />
      <ellipse cx="32" cy="34" rx="8" ry="3.200" className={s.gold} />
    </g>
    <path d="M24 30c4-6 12-6 16 0-4 4-12 4-16 0z" className={f.red} />
    <path d="M30 24c2-5 6-6 8-4-1 4-5 6-8 4zM36 27c3-3 6-3 7-1-2 3-5 3-7 1z" className={f.leaf} />
    <g className="fill-background/80"><circle cx="20" cy="40" r="1" /><circle cx="44" cy="41" r="1" /><circle cx="32" cy="46" r="1" /></g>
  </Frame>
);

export const BananaPbToast = (p: P) => (
  <Frame {...p}>
    <Plate />
    <path d="M14 22q0-8 9-8 4-3 9 0 4-3 9 0 9 0 9 8 0 5-3 6v20H17V28q-3-1-3-6z" className={f.bunD} />
    <path d="M18 24q0-5 7-5 4-2 7 0 4-2 7 0 7 0 7 5v22H18z" className={f.tea} />
    <path d="M18 26h28v10c-6 3-6-2-10 2s-8-1-12 1-6-2-6-2z" className="fill-food-meat/60" />
    {[[24, 26], [32, 24], [40, 26], [28, 34], [36, 33]].map(([x, y]) => (
      <g key={`${x}${y}`}><circle cx={x} cy={y} r="4" className={f.cream} /><circle cx={x} cy={y} r="1" className={f.bunD} /></g>
    ))}
  </Frame>
);

export const CocoaYoghurt = (p: P) => (
  <Frame {...p}>
    <Bowl />
    <ellipse cx="32" cy="36" rx="24" ry="4.500" className={f.cream} />
    <path d="M12 36q6-6 20-6t20 6q-10 4-20 4t-20-4z" className={f.cream} />
    <path d="M18 35c4-3 6 2 10-1s6 2 10-1 6 1 8 0" className="fill-none stroke-food-choc" strokeWidth="2.600" strokeLinecap="round" />
    {[[22, 31], [31, 29], [40, 31]].map(([x, y]) => <g key={x}><circle cx={x} cy={y} r="4" className={f.gold} /><circle cx={x} cy={y} r="1" className={f.bunD} /></g>)}
  </Frame>
);

export const BakedDrumsticks = (p: P) => (
  <Frame {...p}>
    <rect x="4" y="42" width="56" height="14" rx="4" className={f.blue} />
    <rect x="7" y="44" width="50" height="9" rx="3" className="fill-background/30" />
    <Drumstick x={-6} y={4} r={-8} k={0.85} />
    <Drumstick x={14} y={-2} r={10} k={0.85} />
    <path d="M50 28l5-8M53 30l6-5" className={s.leafD} strokeWidth="2" strokeLinecap="round" fill="none" />
  </Frame>
);

export const OatBananaMuffin = (p: P) => (
  <Frame {...p}>
    <Ground rx={20} />
    <path d="M16 34h32l-4 22H20z" className={f.rose} />
    <g className="stroke-food-red-d/30" strokeWidth="1.500"><path d="M24 36l1.500 19M32 36v19M40 36l-1.500 19" /></g>
    <path d="M12 36c-3-14 6-24 20-24s23 10 20 24z" className={f.tea} />
    <path d="M16 32c-1-8 5-14 12-14-5 3-6 9-5 14z" className="fill-food-cream/40" />
    <g className={f.cream}><ellipse cx="30" cy="22" rx="2.500" ry="1.200" /><ellipse cx="40" cy="26" rx="2.500" ry="1.200" /><ellipse cx="22" cy="28" rx="2.500" ry="1.200" /></g>
    <circle cx="36" cy="14" r="4.500" className={f.cream} /><circle cx="36" cy="14" r="1.200" className={f.bunD} />
  </Frame>
);

export const FruitToastRicotta = (p: P) => (
  <Frame {...p}>
    <Plate />
    <path d="M14 22q0-8 9-8 4-3 9 0 4-3 9 0 9 0 9 8 0 5-3 6v20H17V28q-3-1-3-6z" className={f.bunD} />
    <path d="M18 24q0-5 7-5 4-2 7 0 4-2 7 0 7 0 7 5v22H18z" className={f.bun} />
    {[[23, 26], [31, 30], [39, 27], [26, 38], [37, 39], [44, 34]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="2" ry="1.400" className={f.choc} />)}
    <path d="M24 32c0-7 6-9 10-7s8 2 8 8-5 7-10 6-8 0-8-7z" className={f.cream} />
    <circle cx="33" cy="30" r="3.500" className={f.rose} />
  </Frame>
);

export const SparklingLemon = (p: P) => (
  <Frame {...p}>
    <Glass fill="fill-food-blue/35" level={18}>
      <circle cx="28" cy="46" r="2" className="fill-background/80" /><circle cx="35" cy="38" r="1.600" className="fill-background/80" />
      <circle cx="31" cy="28" r="1.400" className="fill-background/80" /><circle cx="37" cy="48" r="1.400" className="fill-background/80" />
      <rect x="27" y="22" width="8" height="8" rx="1.500" transform="rotate(14 31 26)" className="fill-background/70" />
    </Glass>
    <circle cx="44" cy="14" r="9" className={f.gold} /><circle cx="44" cy="14" r="7" className={f.cream} />
    <path d="M44 14V8M44 14l5.500-3M44 14l5.500 3M44 14l-5.500 3M44 14l-5.500-3" className="stroke-food-gold" strokeWidth="1.200" />
  </Frame>
);

export const UnsweetenedIcedTea = (p: P) => (
  <Frame {...p}>
    <Ground rx={20} />
    <path d="M45 22c12-2 12 20 0 18" className="fill-none stroke-food-blue" strokeWidth="3" strokeLinecap="round" />
    <path d="M14 14h30l-2 42H16z" className="fill-background/60" />
    <path d="M15 24h28l-1.600 32H16.600z" className={f.tea} />
    <path d="M14 14h30l-2 42H16z" className="fill-none stroke-food-blue" strokeWidth="1.600" />
    <path d="M12 14h34" className="stroke-food-blue" strokeWidth="3" strokeLinecap="round" />
    <rect x="21" y="28" width="9" height="9" rx="2" transform="rotate(-8 25 32)" className="fill-background/70" />
    <circle cx="36" cy="46" r="7" className={f.gold} /><circle cx="36" cy="46" r="5.200" className={f.cream} />
    <path d="M36 46v-5M36 46l4.500-2.500M36 46l4.500 2.500M36 46l-4.500 2.500M36 46l-4.500-2.500" className="stroke-food-gold" strokeWidth="1" />
    <path d="M24 12c1-6 6-8 9-6-1 5-5 8-9 6z" className={f.leaf} />
  </Frame>
);

/* ---------- Fallback ---------- */

/** A plain plate with a leaf and a spoon: used when an item has no drawing of its own. */
export const GenericDish = (p: P) => (
  <Frame {...p}>
    <Plate />
    <ellipse cx="32" cy="44" rx="14" ry="5" className={f.cream} />
    <path d="M24 42c2-8 12-10 16-3-4 5-12 7-16 3z" className={f.leaf} />
    <path d="M32 40l6-5" className="stroke-food-leaf-d" strokeWidth="1.500" strokeLinecap="round" />
    <circle cx="26" cy="46" r="2" className={f.red} />
  </Frame>
);
