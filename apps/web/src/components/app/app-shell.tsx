"use client";

import type { PlanSummary } from "@preppilot/shared";
import {
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { TechLogo } from "@/components/art/tech-logo";
import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useLocalFlag } from "@/lib/local-flag";
import { usePlans } from "@/lib/queries";
import { LogoMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";

/**
 * Authenticated app frame: collapsible sidebar on large screens, top bar + slide-in drawer on
 * small screens, and a fluid content area (max 1600px). Also gates the area behind auth.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useLocalFlag("pp-sidebar-collapsed");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const next = window.location.pathname + window.location.search;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [status, router]);

  const authed = status === "authenticated";

  return (
    <div className="pp-mesh flex min-h-dvh flex-1">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-surface/70 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex",
          collapsed ? "w-[76px]" : "w-[272px]",
        )}
        aria-label="Sidebar"
      >
        {authed ? (
          <Suspense fallback={<SidebarContent pathname={null} collapsed={collapsed} />}>
            <SidebarWithPath collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
          </Suspense>
        ) : (
          <SidebarSkeleton />
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="pp-glass sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border px-4 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="PrepPilot dashboard">
            <LogoMark className="size-7" />
            <span className="font-semibold tracking-tight">
              Prep<span className="text-primary">Pilot</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-muted hover:text-fg"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </header>

        <main id="main" className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {authed ? children : <PageSkeleton label="Checking your session…" />}
        </main>
      </div>

      <MobileDrawer open={drawerOpen && authed} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function SidebarWithPath({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  const pathname = usePathname();
  return <SidebarContent pathname={pathname} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />;
}

function SidebarSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3 p-4">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mt-6 h-9" />
      <Skeleton className="h-9" />
    </div>
  );
}

interface SidebarContentProps {
  pathname: string | null;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

function SidebarContent({ pathname, collapsed, onToggleCollapse, onNavigate }: SidebarContentProps) {
  const plans = usePlans();
  const activePlanId = pathname?.match(/^\/plans\/([^/]+)/)?.[1];

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <div className={cn("flex h-16 shrink-0 items-center gap-2.5 px-3", collapsed && "justify-center px-0")}>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="size-5" aria-hidden />
          </button>
        )}
        {(!collapsed || !onToggleCollapse) && (
          <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-2 rounded-lg" aria-label="PrepPilot dashboard">
            <LogoMark />
            {!collapsed && (
              <span className="truncate text-[17px] font-semibold tracking-tight">
                Prep<span className="text-primary">Pilot</span>
              </span>
            )}
          </Link>
        )}
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1 px-3 pt-2">
        <NavItem
          href="/dashboard"
          label="Dashboard"
          icon={<LayoutDashboard className="size-[18px]" aria-hidden />}
          active={pathname === "/dashboard"}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <Link
          href="/plans/new"
          onClick={onNavigate}
          aria-current={pathname === "/plans/new" ? "page" : undefined}
          title={collapsed ? "New prep plan" : undefined}
          className={cn(
            "group mt-1 flex items-center gap-3 rounded-xl bg-linear-to-r from-primary to-accent px-3 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5",
            collapsed && "justify-center px-0",
          )}
        >
          <Plus className="size-[18px] transition-transform group-hover:rotate-90" aria-hidden />
          {!collapsed && "New prep plan"}
        </Link>
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        {!collapsed && (
          <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Your plans</p>
        )}
        <div className="pp-scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {plans.isPending ? (
            <div className="flex flex-col gap-2 px-1">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : plans.data && plans.data.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {plans.data.map((plan) => (
                <li key={plan.id}>
                  <PlanNavItem plan={plan} active={plan.id === activePlanId} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          ) : (
            !collapsed && <p className="px-3 text-xs text-fg-subtle">No plans yet — create your first one.</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1 border-t border-border p-3">
        <NavItem
          href="/settings"
          label="Settings"
          icon={<Settings className="size-[18px]" aria-hidden />}
          active={pathname === "/settings"}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <UserCard collapsed={collapsed} />
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted hover:bg-surface-muted hover:text-fg",
        collapsed && "justify-center px-0",
      )}
    >
      {icon}
      {!collapsed && label}
    </Link>
  );
}

function PlanNavItem({
  plan,
  active,
  collapsed,
  onNavigate,
}: {
  plan: PlanSummary;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { completedTopics, totalTopics } = plan.progress;
  const pct = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;
  return (
    <Link
      href={`/plans/${plan.id}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? plan.title : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
        active ? "bg-primary-soft" : "hover:bg-surface-muted",
        collapsed && "justify-center px-0",
      )}
    >
      <TechLogo technology={plan.technology} size="sm" />
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-medium", active ? "text-primary-soft-fg" : "text-fg")}>
            {plan.title}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <span
                className="block h-full rounded-full bg-linear-to-r from-primary to-accent"
                style={{ width: `${plan.status === "ready" ? pct : 0}%` }}
              />
            </span>
            <span className="text-[10px] tabular-nums text-fg-subtle">
              {plan.status === "generating" ? "…" : plan.status === "failed" ? "!" : `${pct}%`}
            </span>
          </span>
        </span>
      )}
    </Link>
  );
}

function UserCard({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "absolute bottom-full z-50 mb-2 w-64 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lift",
              collapsed ? "left-0" : "inset-x-0 w-auto",
            )}
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-fg-subtle">{user.email}</p>
            </div>
            <div className="px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Theme</p>
              <ThemeToggle showLabels className="w-full" />
            </div>
            <div className="border-t border-border p-1.5">
              <Link
                role="menuitem"
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-surface-muted hover:text-fg"
              >
                <Settings className="size-4" aria-hidden /> Settings
              </Link>
              <button
                role="menuitem"
                type="button"
                disabled={loggingOut}
                onClick={async () => {
                  setLoggingOut(true);
                  try {
                    await logout();
                  } finally {
                    setLoggingOut(false);
                    setOpen(false);
                  }
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft disabled:opacity-60"
              >
                <LogOut className="size-4" aria-hidden /> {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-muted",
          collapsed && "justify-center",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-accent text-xs font-bold text-white">
          {initials(user.name)}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block truncate text-xs text-fg-subtle">{user.email}</span>
            </span>
            <ChevronUp className={cn("size-4 text-fg-subtle transition-transform", !open && "rotate-180")} aria-hidden />
          </>
        )}
        {collapsed && <span className="sr-only">Account menu</span>}
      </button>
    </div>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <motion.div
            className="absolute inset-0 bg-overlay backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-surface shadow-2xl outline-none"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3.5 z-10 flex size-9 items-center justify-center rounded-lg text-fg-subtle hover:bg-surface-muted hover:text-fg"
              aria-label="Close navigation"
            >
              <X className="size-5" aria-hidden />
            </button>
            <Suspense fallback={<SidebarContent pathname={null} collapsed={false} onNavigate={onClose} />}>
              <DrawerContent onNavigate={onClose} />
            </Suspense>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function DrawerContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  return <SidebarContent pathname={pathname} collapsed={false} onNavigate={onNavigate} />;
}
