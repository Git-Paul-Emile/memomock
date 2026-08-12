"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, GraduationCap, LogOut, Menu, UserRound } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useNotificationsNonLuesCount } from "@/hooks/use-notifications";
import { NavIcon } from "@/components/layout/nav-icon";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/**
 * Extrait hors du corps de `AppShell` : défini à l'intérieur, ce composant aurait été recréé à
 * chaque rendu (erreur ESLint `react-hooks/static-components`, un nouveau type de composant à
 * chaque rendu forçant React à démonter/remonter les liens de navigation). Reçoit en props tout
 * ce dont il a besoin (les données qui vivaient auparavant dans la closure de `AppShell`).
 */
function NavLinks({
  navItems,
  pathname,
  notificationsNonLues,
  onNavigate,
}: {
  navItems: readonly NavItem[];
  pathname: string;
  notificationsNonLues: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const actif = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              actif
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <NavIcon name={item.icon} className="size-4" />
            {item.label}
            {item.href === "/notifications" && notificationsNonLues > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {notificationsNonLues}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  navItems,
  children,
}: {
  navItems: readonly NavItem[];
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sheetOuvert, setSheetOuvert] = React.useState(false);

  const { total: notificationsNonLues } = useNotificationsNonLuesCount(user?.id);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <GraduationCap className="size-6 text-primary" />
          <span className="font-semibold text-sidebar-foreground">{APP_NAME}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks
            navItems={navItems}
            pathname={pathname}
            notificationsNonLues={notificationsNonLues}
          />
        </div>
        <div className="border-t p-3 text-xs text-muted-foreground">
          Espace {ROLE_LABELS[user.role].toLowerCase()}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Sheet open={sheetOuvert} onOpenChange={setSheetOuvert}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Ouvrir le menu de navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2">
                  <GraduationCap className="size-5 text-primary" />
                  {APP_NAME}
                </SheetTitle>
              </SheetHeader>
              <div className="p-3">
                <NavLinks
                  navItems={navItems}
                  pathname={pathname}
                  notificationsNonLues={notificationsNonLues}
                  onNavigate={() => setSheetOuvert(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <Link href="/notifications" className="relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                notificationsNonLues > 0
                  ? `Notifications (${notificationsNonLues} non lue${notificationsNonLues > 1 ? "s" : ""})`
                  : "Notifications"
              }
            >
              <Bell className="size-5" />
            </Button>
            {notificationsNonLues > 0 && (
              <span className="absolute right-1 top-1 flex size-2 rounded-full bg-destructive" />
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="size-7">
                  <AvatarFallback>{getInitials(user.nom, user.prenom)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">
                  {user.prenom} {user.nom}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {user.prenom} {user.nom}
                  </span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/parametres">
                  <UserRound className="size-4" />
                  Mon compte
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={logout}>
                <LogOut className="size-4" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
