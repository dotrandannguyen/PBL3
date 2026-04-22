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
  { icon: Search, label: "Search" },
  { icon: Home, label: "Home" },

  { icon: Inbox, label: "Inbox" },
];

const NEXUS_APPS = [
  { icon: Mail, label: "Nexus Mail" },
  { icon: Calendar, label: "Nexus Calendar" },
];

const BOTTOM_NAV_ITEMS = [
  { icon: Settings, label: "Settings" },
  { icon: Trash2, label: "Trash" },
];

export { MAIN_NAV_ITEMS, NEXUS_APPS, BOTTOM_NAV_ITEMS };
