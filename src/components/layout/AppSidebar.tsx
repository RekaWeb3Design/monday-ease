import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Plug,
  Zap,
  Activity,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  ClipboardList,
  Eye,
  LogOut,
} from "lucide-react";
import mondayeaseLogo from "@/assets/mondayease_logo.png";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useCustomBoardViews } from "@/hooks/useCustomBoardViews";
import { getIconByName } from "@/components/board-views/IconPicker";
import type { NavItem } from "@/types";

// Owner-only nav items (full access)
const ownerNavItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Organization", url: "/organization", icon: Building2 },
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Boards", url: "/boards", icon: LayoutGrid },
  { title: "Templates", url: "/templates", icon: Zap },
  { title: "Activity", url: "/activity", icon: Activity },
];

// Member nav items (limited access)
const memberNavItems: NavItem[] = [
  { title: "My Tasks", url: "/member", icon: ClipboardList },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { memberRole, organization, signOut } = useAuth();
  const { views } = useCustomBoardViews();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const isOwner = memberRole === "owner";

  // Get active views for sidebar (max 5)
  const activeViews = useMemo(() => {
    return views.filter((v) => v.is_active).slice(0, 5);
  }, [views]);

  const hasMoreViews = views.filter((v) => v.is_active).length > 5;

  // Select nav items based on role
  const navItems = isOwner ? ownerNavItems : memberNavItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-center">
          {isCollapsed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              M
            </div>
          ) : (
            <img
              src={mondayeaseLogo}
              alt="MondayEase"
              className="w-40 h-auto"
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Organization name header (visible when expanded) */}
        {!isCollapsed && organization && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
              Organization
            </p>
            <p className="text-sm font-semibold text-white truncate">
              {organization.name}
            </p>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/" || item.url === "/member"}
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Board Views Section - shown only for owners */}
        {isOwner && activeViews.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-foreground/60">
              Board Views
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activeViews.map((view) => {
                  const IconComponent = getIconByName(view.icon);
                  return (
                    <SidebarMenuItem key={view.id}>
                      <SidebarMenuButton asChild tooltip={view.name}>
                        <NavLink
                          to={`/board-views/${view.slug}`}
                          className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          activeClassName="bg-sidebar-accent text-primary font-medium"
                        >
                          <IconComponent className="h-4 w-4 shrink-0" />
                          <span className="truncate">{view.name}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                {/* "See all" link when there are more views */}
                {hasMoreViews && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="See all views">
                      <NavLink
                        to="/board-views"
                        className="flex items-center gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <Eye className="h-4 w-4 shrink-0" />
                        <span className="text-sm">See all views...</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Management link for owners */}
                {isOwner && !hasMoreViews && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Manage views">
                      <NavLink
                        to="/board-views"
                        className="flex items-center gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <Settings className="h-4 w-4 shrink-0" />
                        <span className="text-sm">Manage views</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Show "Board Views" for owners when there are no active views yet */}
        {isOwner && activeViews.length === 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Board Views">
                    <NavLink
                      to="/board-views"
                      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <Eye className="h-5 w-5 shrink-0" />
                      <span>Board Views</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          {/* Collapse toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={isCollapsed ? "Expand" : "Collapse"}
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {isCollapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronsLeft className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Settings */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <NavLink
                to="/settings"
                className="flex items-center gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeClassName="bg-sidebar-accent text-primary font-medium"
              >
                <Settings className="h-4 w-4" />
                {!isCollapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Sign Out */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign Out"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
