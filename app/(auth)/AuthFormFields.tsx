export function AuthFormFields({ error }: { error?: string }) {
  return (
    <>
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm text-(--color-text-secondary)">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full min-h-[44px] px-3 rounded-lg bg-(--color-bg-surface) border border-(--color-border) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm text-(--color-text-secondary)">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          className="w-full min-h-[44px] px-3 rounded-lg bg-(--color-bg-surface) border border-(--color-border) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        />
      </div>
      {error && <p className="text-sm text-(--color-destructive)">{error}</p>}
    </>
  );
}
