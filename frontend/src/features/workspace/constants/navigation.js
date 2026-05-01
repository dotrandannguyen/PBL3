import {
  Search,
  Home,
  Users,
  Sparkles,
  Inbox,
  Settings,
  Store,
  Trash2,
  Calendar,
  Mail,
} from "lucide-react";

const MAIN_NAV_ITEMS = [
  { icon: Search, id: "search", labelKey: "sidebar.search" },
  { icon: Home, id: "home", labelKey: "sidebar.home" },
  { icon: Inbox, id: "inbox", labelKey: "sidebar.inbox" },
];

const NEXUS_APPS = [
  { icon: Mail, id: "nexus-mail", labelKey: "sidebar.nexusMail" },
  { icon: Calendar, id: "nexus-calendar", labelKey: "sidebar.nexusCalendar" },
];

const BOTTOM_NAV_ITEMS = [
  { icon: Settings, id: "settings", labelKey: "sidebar.settings" },
  { icon: Trash2, id: "trash", labelKey: "sidebar.trash" },
];

export { MAIN_NAV_ITEMS, NEXUS_APPS, BOTTOM_NAV_ITEMS };
