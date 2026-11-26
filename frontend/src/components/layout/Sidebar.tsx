import { NavLink } from "react-router-dom";
import {
  ArrowLeftRight,
  Bookmark,
  Briefcase,
  ClipboardList,
  Compass,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
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
  { label: "Settings", to: "/settings", icon: Settings },
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
  const navContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div
        className={cn(
          "flex h-16 items-center border-b border-slate-200 px-4 dark:border-slate-800",
          !isMobile && collapsed ? "justify-center" : "justify-between"
        )}
      >
        <NavLink to="/" onClick={onCloseMobile} className="outline-none">
          <BrandLogo collapsed={!isMobile && collapsed} />
        </NavLink>

        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav aria-label="Primary navigation" className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isCollapsed = !isMobile && collapsed;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isCollapsed && "justify-center px-2",
                  isActive
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {!isMobile && (
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              collapsed && "justify-center px-2"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 border-r border-slate-200 transition-[width] duration-200 lg:sticky lg:top-0 lg:block lg:h-screen dark:border-slate-800",
          collapsed ? "w-[72px]" : "w-60"
        )}
      >
        {navContent(false)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 border-r border-slate-200 shadow-lg dark:border-slate-800">
            {navContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
