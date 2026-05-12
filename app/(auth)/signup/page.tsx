import Link from "next/link";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-(--color-accent)">LOG</h1>
      <h2 className="text-2xl font-semibold">Create account</h2>
      <SignupForm />
      <div className="text-sm text-(--color-text-secondary)">
        Already have an account?{" "}
        <Link href="/login" className="text-(--color-accent) hover:text-(--color-accent-hover)">
          Sign in
        </Link>
      </div>
    </div>
  );
}
