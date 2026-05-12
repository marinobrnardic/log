import { UpdatePasswordForm } from "./UpdatePasswordForm";

export default function ConfirmResetPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-(--color-accent)">LOG</h1>
      <h2 className="text-2xl font-semibold">Set a new password</h2>
      <UpdatePasswordForm />
    </div>
  );
}
