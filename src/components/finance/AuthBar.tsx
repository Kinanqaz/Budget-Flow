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
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthBar = ({ user, username, loading, authEnabled, signIn, signUp, signOut, deleteAccount }: AuthBarProps) => {
  const [showForm, setShowForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground font-medium">
          {username || user.email}
        </span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="p-1.5 rounded-lg bg-card border border-border hover:bg-destructive/10 transition-colors"
              title="Delete account"
            >
              <Trash2 size={16} className="text-destructive" />
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
          className="p-1.5 rounded-lg bg-card border border-border hover:bg-accent transition-colors"
          title="Sign out"
        >
          <LogOut size={16} className="text-foreground" />
        </button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <LogIn size={14} />
        Sign In
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password, name);
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
    <div className="flex items-center gap-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {!isLogin && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-24 px-2 py-1 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-36 px-2 py-1 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-28 px-2 py-1 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "..." : isLogin ? "Login" : "Register"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setIsLogin(!isLogin)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {isLogin ? <UserPlus size={14} /> : <LogIn size={14} />}
      </button>
      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default AuthBar;
