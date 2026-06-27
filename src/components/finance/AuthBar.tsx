import { useState } from "react";
import { LogOut, LogIn, UserPlus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ApiUser } from "@/types/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AuthBarProps {
  user: ApiUser | null;
  username: string;
  loading: boolean;
  authEnabled: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthBar = ({ user, username, loading, authEnabled, signIn, signUp, signOut, deleteAccount }: AuthBarProps) => {
  const [showForm, setShowForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!authEnabled) return null;

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success("Your account and all data have been deleted.");
      await signOut();
    } catch (e: any) {
      toast.error("Error deleting account: " + (e.message || "Unknown"));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-1 md:gap-2 shrink-0 h-10">
        <span className="text-xs text-foreground font-semibold max-w-[50px] sm:max-w-[100px] truncate select-none hidden sm:inline">
          {username}
        </span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-background md:bg-card border border-border hover:bg-destructive/10 transition-colors"
              title="Delete account"
            >
              <Trash2 size={15} className="text-destructive" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all your saved budget data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <button
          onClick={signOut}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-background md:bg-card border border-border hover:bg-accent transition-colors"
          title="Sign out"
        >
          <LogOut size={15} className="text-foreground" />
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = isLogin
        ? await signIn(usernameInput, password)
        : await signUp(usernameInput, password);
      if (error) {
        const message = error instanceof Error ? error.message : "Authentication error";
        toast.error(message);
      } else {
        if (isLogin) {
          toast.success("Signed in!");
          setShowForm(false);
        } else {
          toast.success("Registration successful! You are now logged in.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative shrink-0">
      {/* Sign In Button */}
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity h-[38px] w-[38px] shrink-0 shadow-sm"
        title="Sign In"
      >
        <LogIn size={16} />
      </button>

      {/* Floating Auth Modal/Window */}
      {showForm && (
        <>
          {/* Backdrop to close when clicking outside */}
          <div 
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" 
            onClick={() => setShowForm(false)}
          />
          <div className="absolute right-0 top-11 mt-1 bg-card border border-border/90 rounded-2xl shadow-xl p-4 z-50 w-72 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
              <span className="font-bold text-xs text-foreground">
                {isLogin ? "Sign In to Account" : "Register Account"}
              </span>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-accent transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required
                  minLength={2}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block block">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                {isLogin ? <LogIn size={13} /> : <UserPlus size={13} />}
                {submitting ? "Authenticating..." : isLogin ? "Login" : "Register"}
              </button>
            </form>

            <div className="pt-2 border-t border-border/40 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2"
              >
                {isLogin ? "Need an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuthBar;
