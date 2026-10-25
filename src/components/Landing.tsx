interface Props {
  onGetStarted: () => void;
}

const C = {
  indigo: '#4F46E5',
  indigoDark: '#3730C3',
  indigoDeep: '#1E1B8B',
  indigoLight: '#EEF2FF',
  indigoMid: 'rgba(79,70,229,0.12)',
  lavender: '#F7F6FB',
  white: '#FFFFFF',
  charcoal: '#1F2033',
  charcoalMid: '#3B3C55',
  muted: '#7C7D9A',
  border: '#E4E3F0',
  borderDark: 'rgba(255,255,255,0.12)',
};
const FONT = "'Geist','Inter',system-ui,sans-serif";

/* ─── Unsplash helpers ─────────────────────────────────────────────────── */
const IMG = {
  vegPile:   'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=900&h=1200&fit=crop&auto=format',
  spoons:    'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=900&h=700&fit=crop&auto=format',
  biryani:   'https://images.unsplash.com/photo-1727404539546-272b2504daab?w=700&h=900&fit=crop&auto=format',
  riceBowl:  'https://images.unsplash.com/photo-1768326119244-6b7055143e5f?w=700&h=700&fit=crop&auto=format',
  pasta:     'https://images.unsplash.com/photo-1614226474520-c9f056fe4b09?w=600&h=600&fit=crop&auto=format',
  ramen:     'https://images.unsplash.com/photo-1731007530051-42866cac7e80?w=600&h=800&fit=crop&auto=format',
  market:    'https://images.unsplash.com/photo-1645976442233-bcf005876613?w=1200&h=800&fit=crop&auto=format',
  fruitMkt:  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&h=700&fit=crop&auto=format',
  vegStand:  'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=800&h=1100&fit=crop&auto=format',
};

/* ─── Phone mockup with mobile app UI ─────────────────────────────────── */
function PhoneMockup() {
  const score = 74;
  const r = 54, cx = 70, cy = 72;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <div style={{
      position: 'relative',
      width: 280,
      height: 580,
      flexShrink: 0,
    }}>
      {/* Phone shell */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, #2a2a3e 0%, #111120 100%)',
        borderRadius: 44,
        border: '7px solid #38384e',
        boxShadow: '0 0 0 1px #1a1a28, 0 48px 120px rgba(79,70,229,0.45), 0 24px 48px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0', color: 'white', fontSize: 11, fontWeight: 600, fontFamily: FONT }}>
          <span>9:41</span>
          <div style={{ width: 80, height: 22, background: '#111120', borderRadius: 12, margin: '0 auto' }} />
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="white"><rect x="0" y="3" width="2" height="7" rx="1"/><rect x="3" y="2" width="2" height="8" rx="1"/><rect x="6" y="1" width="2" height="9" rx="1"/><rect x="9" y="0" width="2" height="10" rx="1"/></svg>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="white"><path d="M7 2.5C8.8 2.5 10.4 3.2 11.6 4.3L13 2.9C11.4 1.4 9.3 0.5 7 0.5C4.7 0.5 2.6 1.4 1 2.9L2.4 4.3C3.6 3.2 5.2 2.5 7 2.5Z"/><circle cx="7" cy="8" r="1.5"/></svg>
          </div>
        </div>

        {/* App header */}
        <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Culinerity</p>
            <p style={{ fontFamily: FONT, fontSize: 14, color: 'white', margin: '1px 0 0', fontWeight: 600 }}>Hey, Amara</p>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'white' }}>A</div>
        </div>

        {/* Score card */}
        <div style={{ margin: '14px 16px 0', background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg viewBox="0 0 140 144" style={{ width: 92, height: 94, flexShrink: 0 }}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#scoreGrad)" strokeWidth={10}
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818CF8" />
                  <stop offset="100%" stopColor="#4F46E5" />
                </linearGradient>
              </defs>
              <text x={cx} y={cy - 7} textAnchor="middle" fontSize="28" fontWeight="700" fill="white" fontFamily={FONT}>{score}</text>
              <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.55)" fontFamily={FONT}>headspace free</text>
              <text x={cx} y={cy + 21} textAnchor="middle" fontSize="8" fill="#818CF8" fontFamily={FONT} fontWeight="600">Strong clarity</text>
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { l: 'Cost pressure', v: 32, c: '#34D399' },
                { l: 'Time load', v: 61, c: '#FBBF24' },
                { l: 'Cultural fit', v: 28, c: '#818CF8' },
              ].map(a => (
                <div key={a.l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: FONT }}>{a.l}</span>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: FONT, fontWeight: 600 }}>{a.v}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
                    <div style={{ height: '100%', width: `${a.v}%`, background: a.c, borderRadius: 2, transition: 'width 1s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(79,70,229,0.25)', borderRadius: 10, border: '1px solid rgba(79,70,229,0.3)' }}>
            <p style={{ fontFamily: FONT, fontSize: 9, color: '#A5B4FC', margin: 0, lineHeight: 1.5 }}>
              Your load is <strong style={{ color: 'white' }}>time</strong>, not money — 2 batch-cook sessions frees ~3 hrs this week.
            </p>
          </div>
        </div>

        {/* Quick stats row */}
        <div style={{ display: 'flex', gap: 8, margin: '10px 16px 0' }}>
          {[
            { label: 'Trade-offs', value: '4/wk', bg: 'rgba(251,191,36,0.15)', accent: '#FBBF24' },
            { label: 'Budget', value: '$180', bg: 'rgba(52,211,153,0.15)', accent: '#34D399' },
            { label: 'FIES', value: '2/8', bg: 'rgba(129,140,248,0.15)', accent: '#818CF8' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 12, padding: '8px 8px', textAlign: 'center', border: `1px solid ${s.accent}30` }}>
              <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: s.accent, margin: 0 }}>{s.value}</p>
              <p style={{ fontFamily: FONT, fontSize: 8, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <p style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Quick actions</p>
          {[
            { icon: '↗', label: 'Craving Swap', desc: 'Find what you want nearby', color: '#818CF8' },
            { icon: '◎', label: 'Food Assets', desc: 'Markets · Fridges · Relief', color: '#34D399' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '9px 12px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: item.color, flexShrink: 0 }}>{item.icon}</div>
              <div>
                <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'white', margin: 0 }}>{item.label}</p>
                <p style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom tab bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'rgba(20,20,35,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px 8px' }}>
          {[
            { icon: '◉', label: 'Home', active: true },
            { icon: '⊞', label: 'Balance', active: false },
            { icon: '⊕', label: 'Log', active: false },
            { icon: '☰', label: 'Tools', active: false },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 16, color: t.active ? '#818CF8' : 'rgba(255,255,255,0.3)' }}>{t.icon}</span>
              <span style={{ fontFamily: FONT, fontSize: 8, color: t.active ? '#818CF8' : 'rgba(255,255,255,0.3)', fontWeight: t.active ? 600 : 400 }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Floating food card ─────────────────────────────────────────────── */
function FoodCard({ img, label, tag, cost, style: s }: { img: string; label: string; tag: string; cost: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.white, borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(31,32,51,0.18), 0 4px 12px rgba(31,32,51,0.08)',
      width: 150, flexShrink: 0, ...s,
    }}>
      <div style={{ height: 100, background: '#ddd', overflow: 'hidden' }}>
        <img src={img} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ padding: '10px 12px' }}>
        <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.charcoal, margin: 0 }}>{label}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontFamily: FONT, fontSize: 10, color: C.indigo, background: C.indigoLight, borderRadius: 999, padding: '2px 7px', fontWeight: 500 }}>{tag}</span>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.charcoal }}>{cost}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat pill ──────────────────────────────────────────────────────── */
function Pill({ text, style: s }: { text: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.white, borderRadius: 999, padding: '8px 16px',
      fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.charcoal,
      boxShadow: '0 4px 20px rgba(31,32,51,0.12)',
      whiteSpace: 'nowrap', ...s,
    }}>{text}</div>
  );
}

/* ─── Feature section ────────────────────────────────────────────────── */
function FeatureRow({
  eyebrow, title, body, bullets, imgSrc, imgAlt, reverse,
}: {
  eyebrow: string; title: string; body: string; bullets: string[];
  imgSrc: string; imgAlt: string; reverse?: boolean;
}) {
  return (
    <div style={{
      maxWidth: 1000, margin: '0 auto', padding: '80px 32px',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: 56, alignItems: 'center',
      direction: reverse ? 'rtl' : 'ltr',
    }}>
      <div style={{ direction: 'ltr' }}>
        <div style={{ display: 'inline-block', background: C.indigoLight, color: C.indigo, borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 600, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>{eyebrow}</div>
        <h2 style={{ fontFamily: FONT, fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, color: C.charcoal, margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{title}</h2>
        <p style={{ fontFamily: FONT, fontSize: 15, color: C.muted, lineHeight: 1.75, margin: '0 0 24px' }}>{body}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bullets.map(b => (
            <div key={b} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: C.indigoLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <div style={{ width: 6, height: 6, borderRadius: 2, background: C.indigo }} />
              </div>
              <span style={{ fontFamily: FONT, fontSize: 14, color: C.charcoalMid, lineHeight: 1.5 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ direction: 'ltr', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(31,32,51,0.14)' }}>
        <img src={imgSrc} alt={imgAlt} style={{ width: '100%', height: 340, objectFit: 'cover', display: 'block' }} />
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────── */
export default function Landing({ onGetStarted }: Props) {
  return (
    <div style={{ fontFamily: FONT, background: C.white, color: C.charcoal, overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.charcoal, letterSpacing: '-0.04em' }}>Culinerity</span>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Features', 'How it works', 'Policy'].map(l => (
              <span key={l} style={{ fontSize: 14, color: C.muted, cursor: 'pointer' }}>{l}</span>
            ))}
          </div>
          <button onClick={onGetStarted} style={{ fontSize: 14, fontWeight: 700, background: C.indigo, color: C.white, border: 'none', borderRadius: 999, padding: '9px 22px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}>
            Get started
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: '100vh', background: `linear-gradient(165deg, #0F0E1F 0%, #1B1840 45%, #0D1F3C 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 32px 80px', position: 'relative', overflow: 'hidden' }}>

        {/* Background food photo overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${IMG.vegPile})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.06, mixBlendMode: 'luminosity' }} />

        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: '15%', left: '8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.3) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Floating food cards — scattered */}
        <div style={{ position: 'absolute', top: '18%', left: '4%', transform: 'rotate(-6deg)', opacity: 0.9 }}>
          <FoodCard img={IMG.biryani} label="Biryani swap" tag="Halal" cost="$12" />
        </div>
        <div style={{ position: 'absolute', bottom: '22%', left: '2%', transform: 'rotate(4deg)', opacity: 0.8 }}>
          <FoodCard img={IMG.ramen} label="Ramen nearby" tag="Family-run" cost="$14" />
        </div>
        <div style={{ position: 'absolute', top: '15%', right: '3%', transform: 'rotate(5deg)', opacity: 0.9 }}>
          <FoodCard img={IMG.riceBowl} label="Rice bowl" tag="Cook at home" cost="$3" />
        </div>
        <div style={{ position: 'absolute', bottom: '18%', right: '4%', transform: 'rotate(-4deg)', opacity: 0.85 }}>
          <FoodCard img={IMG.pasta} label="Pasta pomodoro" tag="Budget" cost="$2" />
        </div>

        {/* Floating stat pills */}
        <Pill text="74% headspace free" style={{ position: 'absolute', top: '38%', left: '8%', background: 'rgba(79,70,229,0.9)', color: 'white', boxShadow: '0 8px 32px rgba(79,70,229,0.5)' }} />
        <Pill text="4 trade-offs this week" style={{ position: 'absolute', bottom: '38%', right: '9%', background: 'rgba(251,191,36,0.95)', color: '#1F2033' }} />
        <Pill text="Community fridge · 0.4 km" style={{ position: 'absolute', top: '52%', left: '5%', background: 'rgba(52,211,153,0.9)', color: '#1F2033' }} />

        {/* Main text + phone */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, maxWidth: 840 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', background: 'rgba(79,70,229,0.3)', color: '#A5B4FC', borderRadius: 999, padding: '5px 16px', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 24, border: '1px solid rgba(129,140,248,0.3)' }}>
              For Australian households
            </div>
            <h1 style={{ fontSize: 'clamp(38px, 6.5vw, 72px)', fontWeight: 900, color: C.white, margin: '0 0 20px', lineHeight: 1.05, letterSpacing: '-0.05em' }}>
              How much of your mind<br />
              does <span style={{ background: 'linear-gradient(135deg, #818CF8, #4F46E5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>feeding your family</span><br />
              take up?
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75, maxWidth: 520, margin: '0 auto 36px' }}>
              Culinerity turns the invisible weight of food insecurity into a measurable score — then gives you tools to lower it.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={onGetStarted} style={{ fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, #818CF8, #4F46E5)', color: C.white, border: 'none', borderRadius: 999, padding: '15px 36px', cursor: 'pointer', boxShadow: '0 8px 40px rgba(79,70,229,0.55)' }}>
                Start for free — takes 5 min
              </button>
              <button style={{ fontSize: 16, fontWeight: 500, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '15px 28px', cursor: 'pointer' }}>
                See how it works
              </button>
            </div>
          </div>

          {/* Phone */}
          <PhoneMockup />
        </div>
      </section>

      {/* ── LOGO ROW ── */}
      <section style={{ background: C.lavender, padding: '44px 32px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 28 }}>Built with data from</p>
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            {['Foodbank Australia', 'OzHarvest', 'SecondBite', 'FAO · FIES', 'City of Melbourne', 'AUSVEG'].map(n => (
              <span key={n} style={{ fontSize: 13, fontWeight: 700, color: '#C0BFCF', letterSpacing: '-0.01em' }}>{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOD PHOTO BAND ── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', height: 280 }}>
          {[IMG.fruitMkt, IMG.spoons, IMG.market].map((src, i) => (
            <div key={i} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <img src={src} alt="food" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.15)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(31,32,51,0.1), rgba(31,32,51,0.3))' }} />
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: FONT, fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 800, color: C.white, textAlign: 'center', letterSpacing: '-0.03em', textShadow: '0 2px 20px rgba(0,0,0,0.4)', margin: 0 }}>
            Your culture. Your cravings. Your food.
          </p>
          <p style={{ fontFamily: FONT, fontSize: 15, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 8px rgba(0,0,0,0.5)', margin: 0 }}>Not a generic basket. Not a lecture. Yours.</p>
        </div>
      </section>

      {/* ── THREE-UP FEATURES ── */}
      <section style={{ background: C.white, padding: '96px 32px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: FONT, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: C.charcoal, margin: '0 0 16px', letterSpacing: '-0.04em' }}>One score. Ten tools. Real relief.</h2>
            <p style={{ fontFamily: FONT, fontSize: 16, color: C.muted, maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>Everything is calibrated to your cultural background, budget, and household — not a textbook idea of nutrition.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              {
                img: IMG.spoons,
                title: 'Culinerity Score',
                desc: 'Five axes — cost, nutrition, time, cultural fit, decision friction — reduced to one empowering number: how much headspace you actually have free.',
                tag: 'The centrepiece',
              },
              {
                img: IMG.biryani,
                title: 'Craving Swap Engine',
                desc: 'Enter what you want — biryani, pad thai, a Big Mac. Get family-run alternatives nearby and a full cook-at-home recipe ranked by your priorities.',
                tag: 'Family-run first',
              },
              {
                img: IMG.riceBowl,
                title: 'Budget Simulator',
                desc: "Stress-test rent hikes, lost shifts, grocery inflation. See how each scenario hits your Culinerity Score before it hits your wallet.",
                tag: 'What-if planning',
              },
            ].map(f => (
              <div key={f.title} style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.white, boxShadow: '0 4px 24px rgba(31,32,51,0.06)' }}>
                <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
                  <img src={f.img} alt={f.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 12, left: 12 }}>
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, background: C.indigo, color: C.white, borderRadius: 999, padding: '4px 12px' }}>{f.tag}</span>
                  </div>
                </div>
                <div style={{ padding: '22px 22px 24px' }}>
                  <h3 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.charcoal, margin: '0 0 10px', letterSpacing: '-0.02em' }}>{f.title}</h3>
                  <p style={{ fontFamily: FONT, fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANTI-STIGMA FEATURE ROW ── */}
      <div style={{ background: C.lavender }}>
        <FeatureRow
          eyebrow="Anti-stigma design"
          title="Free food looks the same as paid food"
          body="Community fridges, food relief, rescue produce boxes, and farmers markets all share the same visual weight as restaurants. Accessing support is a practical decision — the interface treats it exactly that way."
          bullets={[
            'Farmers markets · Community fridges · Rescue produce',
            'All resources displayed with identical visual weight',
            'Location-aware with postcode fallback',
          ]}
          imgSrc={IMG.market}
          imgAlt="Farmers market"
        />
      </div>

      {/* ── CULTURAL FEATURE ROW ── */}
      <div style={{ background: C.white }}>
        <FeatureRow
          eyebrow="Cultural Staples Index"
          title="Tracks the price of basmati rice, not a generic basket"
          body="The Cultural Staples Index tracks what actually matters to your community — halal meat, specific rice varieties, key spices — and flags the price premium compared to mainstream alternatives."
          bullets={[
            'Community-specific staples, not supermarket standards',
            'Halal / kosher premium tracked explicitly over time',
            'Half-price cycle intelligence for your staples',
          ]}
          imgSrc={IMG.spoons}
          imgAlt="Spices and cultural food"
          reverse
        />
      </div>

      {/* ── PANTRY / PHONE FEATURE ── */}
      <section style={{ background: `linear-gradient(160deg, #1B1840 0%, #0F1530 100%)`, padding: '96px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${IMG.vegStand})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.07 }} />
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', background: 'rgba(129,140,248,0.2)', color: '#A5B4FC', borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 24, border: '1px solid rgba(129,140,248,0.25)' }}>
              Cook from what you have
            </div>
            <h2 style={{ fontFamily: FONT, fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, color: C.white, margin: '0 0 20px', letterSpacing: '-0.04em', lineHeight: 1.15 }}>
              Pantry logic. Zero waste. Real recipes.
            </h2>
            <p style={{ fontFamily: FONT, fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, marginBottom: 28 }}>
              Enter what's in your cupboard — or photograph your fridge — and get culturally-relevant recipes that use it up. Attacks waste and cost at once.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: '⊙', text: 'Scan or photograph your fridge', color: '#34D399' },
                { icon: '⊙', text: 'Recipes calibrated to your cultural background', color: '#818CF8' },
                { icon: '⊙', text: 'Ingredient swap tips built into every recipe step', color: '#FBBF24' },
              ].map(b => (
                <div key={b.text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: b.color, fontSize: 16, flexShrink: 0, marginTop: 2 }}>{b.icon}</span>
                  <span style={{ fontFamily: FONT, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Mini phone showing pantry */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 240, background: 'rgba(255,255,255,0.05)', borderRadius: 28, border: '1px solid rgba(255,255,255,0.1)', padding: '20px 18px', backdropFilter: 'blur(10px)', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
              <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.white, margin: '0 0 14px' }}>Cook from pantry</p>
              {[
                { name: 'Dal tadka', uses: 'Lentils · Onion · Cumin', cost: '$1.80/serve', match: 'South Asian' },
                { name: 'Egg fried rice', uses: 'Rice · Eggs · Soy sauce', cost: '$1.50/serve', match: 'East Asian' },
                { name: 'Shakshuka', uses: 'Tomatoes · Eggs · Cumin', cost: '$2.00/serve', match: 'Middle Eastern' },
              ].map((r, i) => (
                <div key={r.name} style={{ marginBottom: 10, background: i === 0 ? 'rgba(79,70,229,0.25)' : 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '10px 12px', border: `1px solid ${i === 0 ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.white }}>{r.name}</span>
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#34D399' }}>{r.cost}</span>
                  </div>
                  <span style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{r.uses}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── POLICY ── */}
      <section style={{ background: C.lavender, padding: '80px 32px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: C.indigoLight, color: C.indigo, borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>B2G / B2B layer</div>
          <h2 style={{ fontFamily: FONT, fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, color: C.charcoal, margin: '0 0 20px', letterSpacing: '-0.04em', lineHeight: 1.2 }}>Real-time suburb-level food stress data</h2>
          <p style={{ fontFamily: FONT, fontSize: 16, color: C.muted, maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.75 }}>Currently, councils wait for annual surveys. This is live, postcode-resolution, opt-in, and anonymised — and it lets them model interventions before funding them.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'Policy dashboard', desc: 'Suburb-level Culinerity and friction scores, continuously updated', icon: '◎' },
              { label: 'Policy simulator', desc: 'Model meal programs vs vouchers vs market subsidies before committing', icon: '⊞' },
              { label: 'Privacy-first', desc: 'On-device by default. Sharing is opt-in, strictly anonymised, reversible', icon: '⊛' },
            ].map(c => (
              <div key={c.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px 20px', textAlign: 'left' }}>
                <div style={{ fontSize: 22, color: C.indigo, marginBottom: 12 }}>{c.icon}</div>
                <p style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.charcoal, margin: '0 0 8px' }}>{c.label}</p>
                <p style={{ fontFamily: FONT, fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src={IMG.fruitMkt} alt="market" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.5)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(79,70,229,0.92) 0%, rgba(30,27,139,0.96) 100%)' }} />
        </div>
        <div style={{ position: 'relative', padding: '96px 32px', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontFamily: FONT, fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, color: C.white, margin: '0 0 20px', letterSpacing: '-0.05em', lineHeight: 1.05 }}>
            Start measuring what food stress actually costs you
          </h2>
          <p style={{ fontFamily: FONT, fontSize: 17, color: 'rgba(255,255,255,0.7)', margin: '0 0 40px', lineHeight: 1.7 }}>5 minutes to set up. Your data stays on your device. Free, always.</p>
          <button onClick={onGetStarted} style={{ fontFamily: FONT, fontSize: 17, fontWeight: 800, background: C.white, color: C.indigo, border: 'none', borderRadius: 999, padding: '18px 48px', cursor: 'pointer', boxShadow: '0 12px 48px rgba(0,0,0,0.25)', letterSpacing: '-0.02em' }}>
            Get started — free
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: C.charcoal, padding: '36px 32px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.white, letterSpacing: '-0.04em' }}>Culinerity</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Data on-device by default · Privacy-first · Australia</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy', 'Policy layer', 'Contact'].map(l => (
              <span key={l} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
