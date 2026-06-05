import Header from "@/components/Header";
import RouletteField from "@/pages/RouletteField";

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", flexDirection: "column" }}>
      <Header />
      <RouletteField />
    </div>
  );
}
