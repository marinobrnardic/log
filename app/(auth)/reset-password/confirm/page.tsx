import { Logo } from "@/components/brand/Logo";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export default function ConfirmResetPage() {
  return (
    <div className="space-y-6">
      <Logo size={40} />
      <h2 className="text-2xl font-semibold">Set a new password</h2>
      <UpdatePasswordForm />
    </div>
  );
}
