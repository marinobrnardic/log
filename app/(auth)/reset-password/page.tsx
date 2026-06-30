import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <Logo size={40} />
      <h2 className="text-2xl font-semibold">Reset password</h2>
      <p className="text-sm text-(--color-text-secondary)">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <ResetPasswordForm />
      <div className="text-sm text-(--color-text-secondary)">
        <Link href="/login" className="text-(--color-accent) hover:text-(--color-accent-hover)">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
