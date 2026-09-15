import { useState } from "react";
import type { FormEvent } from "react";
import { login } from "@/lib/api";

type Props = {
  onSuccess: () => void;
};

// No design-HTML mock exists for this page (feature 26 is new scope) — built
// directly from ui-tokens.md's Input/primary-button specs and the app
// shell's own floating-card treatment (bg-surface/border/rounded-lg/shadow-shell),
// same approach ContractCard/ScriptCard took when they had no mock either.
export function LoginPage({ onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await login(password);
    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="w-full max-w-[320px] rounded-lg border-[0.5px] border-border bg-surface p-6 shadow-shell"
      >
        <div className="mb-5 text-center">
          <div className="font-display text-[20px] italic leading-[1.1] text-pink">Glam AI</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-text-secondary">
            Your personal assistant
          </div>
        </div>

        <label htmlFor="dashboard-password" className="mb-1.5 block text-[12px] font-medium text-text-primary">
          Password
        </label>
        <input
          id="dashboard-password"
          type="password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border-[0.5px] border-border bg-surface px-3 py-2 text-[13px] text-text-primary focus:border-pink-mid focus:outline-none"
        />

        {error && <div className="mt-2 text-[11px] text-text-secondary">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting || password.length === 0}
          className="mt-3.5 w-full rounded-md bg-pink px-3 py-2 text-[13px] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
