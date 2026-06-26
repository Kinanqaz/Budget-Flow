import React, { useRef } from "react";
import { 
  Sun, Moon, Globe, Shield, Save, 
  Download, Upload, Check, Info 
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  currency: string;
  setCurrency: (c: string) => void;
  currencies: string[];
  save: () => Promise<void> | void;
  saveToJson: () => void;
  importFromJson: (file: File) => void;
  loading: boolean;
  username: string | null;
  authEnabled: boolean;
}

export default function SettingsPanel({
  darkMode,
  setDarkMode,
  currency,
  setCurrency,
  currencies,
  save,
  saveToJson,
  importFromJson,
  loading,
  username,
  authEnabled,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleTheme = (mode: "light" | "dark") => {
    const isDark = mode === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    toast.success(`Switched to ${mode} mode!`);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importFromJson(file);
      e.target.value = "";
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6 p-2 select-none">
      <div>
        <h2 className="text-xl font-bold text-foreground">App Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Customize your workspace and manage your finance data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Preferences */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Globe className="text-primary shrink-0" size={16} />
            <h3 className="text-sm font-bold text-foreground">Preferences</h3>
          </div>

          {/* Theme Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Interface Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleToggleTheme("light")}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-all ${
                  !darkMode
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground hover:text-foreground border-border/80 hover:bg-accent"
                }`}
              >
                <Sun size={15} /> Light Mode
              </button>
              <button
                onClick={() => handleToggleTheme("dark")}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-all ${
                  darkMode
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground hover:text-foreground border-border/80 hover:bg-accent"
                }`}
              >
                <Moon size={15} /> Dark Mode
              </button>
            </div>
          </div>

          {/* Currency selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Default Currency Symbol
            </label>
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  toast.success(`Currency changed to ${e.target.value}`);
                }}
                className="w-full bg-background border border-border/80 text-foreground py-2.5 px-3.5 pr-8 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring appearance-none cursor-pointer"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c} (Active Currency)
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <Globe size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Backup & Operations */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Shield className="text-primary shrink-0" size={16} />
            <h3 className="text-sm font-bold text-foreground">Data Management</h3>
          </div>

          {/* Sync / Database Save */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Database Sync
            </label>
            <button
              onClick={save}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-95 transition-all shadow-sm disabled:opacity-50"
            >
              <Save size={15} /> {loading ? "Saving changes..." : "Save Data"}
            </button>
            {authEnabled && username && (
              <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <Check size={10} className="text-green-500" /> Synced to account: <span className="font-semibold">{username}</span>
              </p>
            )}
          </div>

          {/* Backup Restores (JSON) */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              JSON File Backup
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={saveToJson}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-background text-foreground border border-border rounded-xl text-xs font-semibold hover:bg-accent transition-all"
              >
                <Download size={14} /> Export JSON
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-background text-foreground border border-border rounded-xl text-xs font-semibold hover:bg-accent transition-all"
              >
                <Upload size={14} /> Import JSON
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Info Tips Banner */}
      <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-start gap-3 text-muted-foreground text-xs leading-relaxed">
        <Info className="text-primary shrink-0 mt-0.5" size={16} />
        <div>
          <span className="font-bold block text-foreground mb-0.5">Auto-Save Feature</span>
          By default, changes are automatically saved to your local cache. If you are signed in, they will automatically sync to our servers within 2 seconds of any edit. You can use the data management tools above to perform manual backups.
        </div>
      </div>
    </div>
  );
}
