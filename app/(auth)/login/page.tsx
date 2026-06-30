import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <Logo size={40} />
      <h2 className="text-2xl font-semibold">Sign in</h2>
      <LoginForm />
      <div className="text-sm text-(--color-text-secondary) space-y-2">
        <div>
          New here?{" "}
          <Link href="/signup" className="text-(--color-accent) hover:text-(--color-accent-hover)">
            Create an account
          </Link>
        </div>
        <div>
          <Link href="/reset-password" className="text-(--color-accent) hover:text-(--color-accent-hover)">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
