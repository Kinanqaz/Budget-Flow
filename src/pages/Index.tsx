import { useEffect, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuth } from "@/hooks/useAuth";
import FinanceSidebar from "@/components/finance/FinanceSidebar";
import SankeyChart from "@/components/finance/SankeyChart";
import AuthBar from "@/components/finance/AuthBar";
import { PanelLeftOpen, Moon, Sun, ChevronDown, GitBranch, PieChart } from "lucide-react";
import DonutChart from "@/components/finance/DonutChart";

const Index = () => {
  const { user, loading: authLoading, username, authEnabled, signIn, signUp, signOut, deleteAccount } = useAuth();

  const {
    data, stats, darkMode, setDarkMode, currency, setCurrency, currencies, loading,
    updateIncome, addIncome, removeIncome,
    updateCategory, addCategory, removeCategory,
    updateItem, addItem, removeItem,
    save, saveToJson, importFromJson,
  } = useFinanceData(user?.id, !!user);

  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPercent, setShowPercent] = useState(false);
  const [chartType, setChartType] = useState<"sankey" | "donut">("sankey");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="flex h-screen overflow-hidden relative">
      <div
        className={`transition-all duration-300 ease-in-out ${sidebarOpen ? "w-[300px] min-w-[300px]" : "w-0 min-w-0"} overflow-hidden`}
      >
        <FinanceSidebar
          data={data}
          updateIncome={updateIncome}
          addIncome={addIncome}
          removeIncome={removeIncome}
          updateCategory={updateCategory}
          addCategory={addCategory}
          removeCategory={removeCategory}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          save={save}
          saveToJson={saveToJson}
          importFromJson={importFromJson}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 overflow-auto p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors"
              title="Open sidebar"
            >
              <PanelLeftOpen size={18} className="text-foreground" />
            </button>
          )}
          <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowPercent(false)}
              className={`px-3 py-1.5 text-sm font-semibold transition-colors ${!showPercent ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {currency}
            </button>
            <button
              onClick={() => setShowPercent(true)}
              className={`px-3 py-1.5 text-sm font-semibold transition-colors ${showPercent ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              %
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setCurrencyMenuOpen((o) => !o)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-card border border-border hover:bg-accent transition-colors text-sm"
              title="Select currency"
            >
              {currency} <ChevronDown size={14} />
            </button>
            {currencyMenuOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[60px]">
                {currencies.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCurrency(c); setCurrencyMenuOpen(false); }}
                    className={`w-full px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors ${c === currency ? "bg-primary/10 text-primary" : ""}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setDarkMode((d) => !d)}
            className="p-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors"
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun size={18} className="text-foreground" /> : <Moon size={18} className="text-foreground" />}
          </button>

          <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setChartType("sankey")}
              className={`p-2 transition-colors ${chartType === "sankey" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Flow chart"
            >
              <GitBranch size={18} />
            </button>
            <button
              onClick={() => setChartType("donut")}
              className={`p-2 transition-colors ${chartType === "donut" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Donut chart"
            >
              <PieChart size={18} />
            </button>
          </div>

          <div className="flex-1" />
          <AuthBar
            user={user}
            username={username}
            loading={authLoading}
            authEnabled={authEnabled}
            signIn={signIn}
            signUp={signUp}
            signOut={signOut}
            deleteAccount={deleteAccount}
          />
        </div>

        <div className="flex-1 bg-card border border-border rounded-xl p-4 flex items-center justify-center min-h-0">
          {chartType === "sankey" ? (
            <SankeyChart data={data} stats={stats} showPercent={showPercent} currency={currency} />
          ) : (
            <DonutChart data={data} stats={stats} currency={currency} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
