import { TopNav } from "@/components/nav/TopNav";
import { BottomTabs } from "@/components/nav/BottomTabs";
import { FlowGuardProvider } from "@/components/nav/FlowGuardContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FlowGuardProvider>
      <TopNav />
      <main className="pt-24 pb-24 px-4 max-w-[640px] mx-auto min-h-dvh">
        {children}
      </main>
      <BottomTabs />
    </FlowGuardProvider>
  );
}
