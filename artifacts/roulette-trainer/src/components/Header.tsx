export default function Header() {
  return (
    <header style={s.header}>
      <div style={s.inner}>

        {/* ── Logo ── */}
        <div style={s.logo}>
          <div style={s.logoTitle}>CHICAGO</div>
          <div style={s.logoSub}>DEALER TRAINER&nbsp;•&nbsp;1932</div>
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
    flexDirection: "column",
    lineHeight: 1,
    cursor: "default",
    userSelect: "none",
    flexShrink: 0,
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
  actions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexShrink: 0,
  },
  btnLogin: {
    padding: "7px 24px",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    border: "1.5px solid #d4a832",
    background: "transparent",
    color: "#d4a832",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  btnStart: {
    padding: "7px 24px",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    border: "none",
    background: "#d4a832",
    color: "#111",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background 0.15s",
  },
};
