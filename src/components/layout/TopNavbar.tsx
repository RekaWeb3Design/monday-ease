import { Moon, Sun, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface TopNavbarProps {
  pageTitle?: string;
}

export function TopNavbar({ pageTitle = "Dashboard" }: TopNavbarProps) {
  const { profile, signOut } = useAuth();

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "User";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      {/* Left side: Sidebar trigger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <nav className="flex items-center text-sm text-muted-foreground">
          <span>MondayEase</span>
          <ChevronRight className="mx-1 h-4 w-4" />
          <span className="font-medium text-foreground">{pageTitle}</span>
        </nav>
      </div>

      {/* Right side: Theme toggle + User dropdown */}
      <div className="flex items-center gap-2">
        {/* Theme toggle (visual only for now) */}
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
