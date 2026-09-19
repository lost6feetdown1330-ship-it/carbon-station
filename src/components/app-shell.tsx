import { Link, useRouterState } from "@tanstack/react-router";
import { Inbox, Printer, Send, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { unreadCount, useFaxStore } from "@/lib/store";

const tabs = [
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/", label: "Machine", icon: Printer },
  { to: "/sent", label: "Sent", icon: Send },
  { to: "/contacts", label: "Directory", icon: Users },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onboarded = useFaxStore((s) => s.settings.onboarded);
  const hideNav =
    !onboarded ||
    pathname.startsWith("/send/") ||
    pathname.startsWith("/scan") ||
    pathname.startsWith("/legal");
  const unread = useFaxStore((s) => unreadCount(s.faxes));

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div
        className={cn(
          "mx-auto flex min-h-dvh w-full max-w-lg flex-col",
          hideNav ? "pb-0" : "pb-[4.5rem]",
        )}
      >
        {children}
      </div>
      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur-sm">
          <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
            {tabs.map((tab) => {
              const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] tracking-wide transition-colors duration-150",
                    active ? "text-lcd" : "text-fg-subtle hover:text-fg",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                  {tab.label}
                  {tab.to === "/inbox" && unread > 0 && (
                    <span className="absolute top-1 right-[calc(50%-18px)] min-w-4 rounded-full bg-lcd px-1 text-[9px] font-medium text-lcd-deep tabular-nums">
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  action,
}: {
  kicker?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pt-6 pb-3">
      <div>
        {kicker && (
          <p className="font-mono text-[10px] tracking-[0.28em] text-fg-subtle uppercase">{kicker}</p>
        )}
        <h1 className="mt-1 text-2xl font-medium tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  );
}
