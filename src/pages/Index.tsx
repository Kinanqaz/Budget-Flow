import { useEffect, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuth } from "@/hooks/useAuth";
import FinanceSidebar from "@/components/finance/FinanceSidebar";
import SankeyChart from "@/components/finance/SankeyChart";
import AuthBar from "@/components/finance/AuthBar";
import { PanelLeftOpen, ChevronDown, Split, PieChart, Table, Settings } from "lucide-react";
import DonutChart from "@/components/finance/DonutChart";
import FinanceTable from "@/components/finance/FinanceTable";
import SettingsPanel from "@/components/finance/SettingsPanel";

const Index = () => {
  const { user, loading: authLoading, username, authEnabled, signIn, signUp, signOut, deleteAccount } = useAuth();

  const {
    data, setData, stats, darkMode, setDarkMode, currency, setCurrency, currencies, loading,
    updateIncome, addIncome, removeIncome, moveIncome,
    updateCategory, addCategory, removeCategory, moveCategory,
    updateItem, addItem, removeItem, moveItem, moveItemCategory,
    updateRemainingColor,
    updateIncomeColor,
    importFromCsv,
    exportToCsv,
    save, saveToJson, importFromJson,
  } = useFinanceData(user?.id, !!user);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPercent, setShowPercent] = useState(false);
  const [chartType, setChartType] = useState<"sankey" | "donut" | "table" | "settings">("sankey");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Sidebar Overlay backdrop on mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? "w-[300px] min-w-[300px] md:relative fixed inset-y-0 left-0 z-50 shadow-2xl md:shadow-none" 
            : "w-0 min-w-0 md:relative fixed inset-y-0 left-0"
        } overflow-hidden`}
      >
        <FinanceSidebar
          data={data}
          updateIncome={updateIncome}
          addIncome={addIncome}
          removeIncome={removeIncome}
          moveIncome={moveIncome}
          updateCategory={updateCategory}
          addCategory={addCategory}
          removeCategory={removeCategory}
          moveCategory={moveCategory}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          moveItem={moveItem}
          updateIncomeColor={updateIncomeColor}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 overflow-auto p-4 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-2.5 mb-4 bg-card md:bg-transparent p-2.5 md:p-0 border border-border/40 md:border-none rounded-2xl select-none w-full flex-nowrap">
          {/* Left: Sidebar Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-background md:bg-card border border-border hover:bg-accent transition-colors shrink-0"
                title="Open sidebar"
              >
                <PanelLeftOpen size={18} className="text-foreground" />
              </button>
            )}
          </div>

          {/* Right: Consolidated Controls (Currency + Views + Account) */}
          <div className="flex items-center gap-2 shrink-0 ml-auto flex-nowrap flex-1 md:flex-initial justify-end">
            {/* Unit Toggle */}
            <div className="flex items-center bg-background md:bg-card border border-border rounded-xl overflow-hidden h-10 flex-1 md:flex-initial">
              <button
                onClick={() => setShowPercent(false)}
                className={`flex-1 md:px-3 text-xs font-semibold h-full transition-colors ${!showPercent ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {currency}
              </button>
              <button
                onClick={() => setShowPercent(true)}
                className={`flex-1 md:px-3.5 text-xs font-semibold h-full transition-colors ${showPercent ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                %
              </button>
            </div>

            {/* Chart Switcher */}
            <div className="flex items-center bg-background md:bg-card border border-border rounded-xl overflow-hidden h-10 flex-[2] md:flex-initial">
              <button
                onClick={() => setChartType("sankey")}
                className={`flex-1 md:px-3.5 h-full flex items-center justify-center transition-colors ${chartType === "sankey" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Flow chart"
              >
                <Split size={16} />
              </button>
              <button
                onClick={() => setChartType("donut")}
                className={`flex-1 md:px-3.5 h-full flex items-center justify-center transition-colors ${chartType === "donut" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Donut chart"
              >
                <PieChart size={16} />
              </button>
              <button
                onClick={() => setChartType("table")}
                className={`flex-1 md:px-3.5 h-full flex items-center justify-center transition-colors ${chartType === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Table View"
              >
                <Table size={16} />
              </button>
              <button
                onClick={() => setChartType("settings")}
                className={`flex-1 md:px-3.5 h-full flex items-center justify-center transition-colors ${chartType === "settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Settings"
              >
                <Settings size={16} />
              </button>
            </div>

            {/* Profile Bar */}
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
        </div>

        <div className="flex-1 bg-card border border-border rounded-xl p-4 flex flex-col min-h-0 overflow-y-auto">
          {chartType === "sankey" ? (
            <SankeyChart data={data} stats={stats} showPercent={showPercent} currency={currency} />
          ) : chartType === "donut" ? (
            <DonutChart data={data} stats={stats} currency={currency} showPercent={showPercent} />
          ) : chartType === "table" ? (
            <FinanceTable
              data={data}
              setData={setData}
              stats={stats}
              updateItem={updateItem}
              removeItem={removeItem}
              moveItemCategory={moveItemCategory}
              addItem={addItem}
              currency={currency}
            />
          ) : (
            <SettingsPanel
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              currency={currency}
              setCurrency={setCurrency}
              currencies={currencies}
              remainingColor={data.remainingColor}
              updateRemainingColor={updateRemainingColor}
              importFromCsv={importFromCsv}
              exportToCsv={exportToCsv}
              save={save}
              saveToJson={saveToJson}
              importFromJson={importFromJson}
              loading={loading}
              username={username}
              authEnabled={authEnabled}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
