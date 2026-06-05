import Header from "@/components/Header";
import RouletteField from "@/pages/RouletteField";

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{
        width: "100%",
        background: "#0d0d0d",
        borderBottom: "1px solid #2a2410",
        padding: "22px 16px 18px",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Times New Roman', Georgia, serif",
          fontSize: "clamp(28px, 5vw, 52px)",
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: "#d4a832",
          lineHeight: 1,
          textTransform: "uppercase",
        }}>
          Roulette Dealer Trainer
        </div>
        <div style={{
          marginTop: "8px",
          fontSize: "13px",
          letterSpacing: "0.12em",
          color: "#a08840",
          fontWeight: 400,
        }}>
          тренажёр расчёта выплат для крупье
        </div>
      </div>
      <RouletteField />
    </div>
  );
}
