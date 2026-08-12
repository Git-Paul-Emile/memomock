import {
  LayoutDashboard,
  UploadCloud,
  Bell,
  Settings,
  BookMarked,
  Wand2,
  ServerCog,
  UserPlus,
  SlidersHorizontal,
  LifeBuoy,
  Files,
  ClipboardList,
  History,
  Building2,
  Users,
  Library,
  BarChart3,
  FolderKanban,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  UploadCloud,
  Bell,
  Settings,
  BookMarked,
  Wand2,
  ServerCog,
  UserPlus,
  SlidersHorizontal,
  LifeBuoy,
  Files,
  ClipboardList,
  History,
  Building2,
  Users,
  Library,
  BarChart3,
  FolderKanban,
  GitBranch,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}
