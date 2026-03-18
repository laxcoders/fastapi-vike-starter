import { useAuthStore } from "@/stores/auth-store";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.first_name ?? "there";

  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="mb-1 text-xl font-extrabold text-foreground">Good morning, {firstName} 👋</h1>
      <p className="mb-5 text-xs text-muted-foreground">
        Dashboard coming soon — client grid, health scores, and alerts will appear here.
      </p>

      {/* Stat grid placeholder */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Clicks", value: "—", delta: "MoM" },
          { label: "Total Impressions", value: "—", delta: "MoM" },
          { label: "Clients Healthy", value: "—", delta: "" },
          { label: "Pending Approvals", value: "—", delta: "" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[10px] border border-border bg-card p-4">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </div>
            <div className="text-[22px] font-extrabold text-foreground">{stat.value}</div>
            <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{stat.delta}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[10px] border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Client cards will appear here once onboarding is built in Phase 1.
      </div>
    </div>
  );
}
