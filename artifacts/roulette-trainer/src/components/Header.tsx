function RouletteWheelIcon({ size = 32 }: { size?: number }) {
  const pockets = 37;
  const r = 46;
  const innerR = 28;
  const segments: React.ReactNode[] = [];
  for (let i = 0; i < pockets; i++) {
    const a1 = (i / pockets) * 2 * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / pockets) * 2 * Math.PI - Math.PI / 2;
    const x1 = 50 + r * Math.cos(a1), y1 = 50 + r * Math.sin(a1);
    const x2 = 50 + r * Math.cos(a2), y2 = 50 + r * Math.sin(a2);
    const xi1 = 50 + innerR * Math.cos(a1), yi1 = 50 + innerR * Math.sin(a1);
    const xi2 = 50 + innerR * Math.cos(a2), yi2 = 50 + innerR * Math.sin(a2);
    const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    const num = i === 0 ? 0 : i;
    const fill = num === 0 ? "#1a6b1a" : RED.includes(num) ? "#8b1a1a" : "#1a1a1a";
    segments.push(
      <path key={i}
        d={`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 0 0 ${xi1} ${yi1} Z`}
        fill={fill} stroke="#d4a832" strokeWidth="0.6"
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r="49" fill="#111" stroke="#d4a832" strokeWidth="1.5" />
      {segments}
      <circle cx="50" cy="50" r={innerR - 2} fill="#0d0d0d" stroke="#d4a832" strokeWidth="1" />
      <circle cx="50" cy="50" r="8" fill="#d4a832" />
      <circle cx="50" cy="50" r="4" fill="#111" />
    </svg>
  );
}

export default function Header() {
  return (
    <header style={s.header}>
      <div style={s.inner}>

        {/* ── Logo ── */}
        <div style={s.logo}>
          <RouletteWheelIcon size={38} />
          <div style={s.logoText}>
            <div style={s.logoTitle}>CHICAGO</div>
            <div style={s.logoSub}>DEALER TRAINER&nbsp;•&nbsp;1932&nbsp;•&nbsp;Тренировочный центр дилеров мы существуем с 1932 года</div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={s.nav}>
          {["Рулетка", "Ставки", "Обучение", "Экзамен"].map(item => (
            <a key={item} href="#" style={s.navLink}
              onMouseEnter={e => (e.currentTarget.style.color = "#d4a832")}
              onMouseLeave={e => (e.currentTarget.style.color = "#e8e8e8")}
            >
              {item}
            </a>
          ))}
        </nav>

      </div>
    </header>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    width: "100%",
    background: "#110e07",
    borderBottom: "1px solid #d4a832",
    position: "sticky",
    top: 0,
    zIndex: 100,
    flexShrink: 0,
  },
  inner: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 28px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "24px",
  },
  logo: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "10px",
    cursor: "default",
    userSelect: "none",
    flexShrink: 0,
  },
  logoText: {
    display: "flex",
    flexDirection: "column",
    lineHeight: 1,
  },
  logoTitle: {
    fontFamily: "'Times New Roman', Georgia, serif",
    fontSize: "22px",
    fontWeight: 700,
    letterSpacing: "0.18em",
    color: "#d4a832",
  },
  logoSub: {
    fontSize: "9px",
    letterSpacing: "0.22em",
    color: "#d4a832",
    marginTop: "2px",
    fontWeight: 500,
  },
  nav: {
    display: "flex",
    gap: "32px",
    alignItems: "center",
  },
  navLink: {
    color: "#e8e8e8",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
    letterSpacing: "0.03em",
    transition: "color 0.15s",
  },
};
