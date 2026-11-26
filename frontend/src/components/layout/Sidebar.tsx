import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeftRight,
  Bookmark,
  Briefcase,
  ClipboardList,
  Compass,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/common/BrandLogo";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard, end: true },
  { label: "Explore Stocks", to: "/stocks", icon: Compass },
  { label: "My Portfolio", to: "/portfolio", icon: Briefcase },
  { label: "Orders", to: "/orders", icon: ClipboardList },
  { label: "Transactions", to: "/transactions", icon: ArrowLeftRight },
  { label: "Watchlist", to: "/watchlist", icon: Bookmark },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navContent = (isMobile: boolean) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div className="flex h-full flex-col bg-[var(--tx-bg)] text-[var(--tx-text)]">
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-[var(--tx-border)] px-4",
            isCollapsed ? "justify-center px-2" : "justify-between"
          )}
        >
          <NavLink
            to="/"
            onClick={onCloseMobile}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--tx-border-hover)]"
          >
            <BrandLogo collapsed={isCollapsed} />
          </NavLink>

          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--tx-text-muted)] transition-colors hover:bg-[var(--tx-glass)] hover:text-[var(--tx-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav
          aria-label="Primary navigation"
          className="flex-1 overflow-y-auto px-3 py-4 tx-scrollbar"
        >
          {!isCollapsed && (
            <p className="tx-label mb-2.5 px-2.5">Workspace</p>
          )}

          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onCloseMobile}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-3 rounded-lg border px-3 py-2 text-[13px] font-medium tracking-[-0.01em] transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--tx-border-hover)]",
                      isCollapsed && "justify-center px-2",
                      isActive
                        ? "border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        : "border-transparent text-[var(--tx-text-muted)] hover:bg-[var(--tx-glass)] hover:text-[var(--tx-text-secondary)]"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {!isCollapsed && isActive && (
                        <motion.span
                          layoutId={
                            isMobile
                              ? "sidebar-active-bar-mobile"
                              : "sidebar-active-bar-desktop"
                          }
                          aria-hidden="true"
                          transition={{
                            type: "spring",
                            stiffness: 480,
                            damping: 38,
                          }}
                          className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[var(--tx-text)]"
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-[var(--tx-text)]"
                            : "text-[var(--tx-text-muted)] group-hover:text-[var(--tx-text-secondary)]"
                        )}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {!isMobile && (
          <div className="border-t border-[var(--tx-border)] p-3">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-xs font-medium text-[var(--tx-text-muted)] transition-colors hover:border-[var(--tx-border)] hover:bg-[var(--tx-glass)] hover:text-[var(--tx-text-secondary)]",
                collapsed && "justify-center px-2"
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 shrink-0" />
                  <span className="truncate">Collapse sidebar</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 border-r border-[var(--tx-border)] bg-[var(--tx-bg)] transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:block lg:h-screen",
          collapsed ? "w-[72px]" : "w-60"
        )}
      >
        {navContent(false)}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              onClick={onCloseMobile}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-50 w-64 border-r border-[var(--tx-border-strong)] bg-[var(--tx-bg)] shadow-[0_24px_48px_rgba(0,0,0,0.85)]"
            >
              {navContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
