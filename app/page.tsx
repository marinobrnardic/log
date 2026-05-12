import { redirect } from "next/navigation";

// Middleware normally handles redirects from /, but render-time fallback
// covers the case where middleware is bypassed (e.g. local dev edge cases).
export default function RootPage() {
  redirect("/workouts");
}
