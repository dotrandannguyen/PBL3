import React from "react";
import {
  Mail,
  Github,
  Chrome,
  Clock,
  MoreHorizontal,
  PlayCircle,
  Book,
  BookOpen,
} from "lucide-react";

// Mock Data
const RECENT_EMAILS = [
  {
    id: 1,
    source: "google",
    sender: "Google Security",
    subject: "Security alert",
    time: "3w ago",
    icon: Chrome,
    color: "#ea4335",
  },
  {
    id: 2,
    source: "github",
    sender: "GitHub",
    subject: "[GitHub] Personal access token added",
    time: "3w ago",
    icon: Github,
    color: "#24292f",
  },
  {
    id: 3,
    source: "google",
    sender: "Youtube Creators",
    subject: "Your weekly stats are in!",
    time: "3w ago",
    icon: Chrome,
    color: "#ea4335",
  },
  {
    id: 4,
    source: "github",
    sender: "Vercel",
    subject: "Deployment failed",
    time: "3w ago",
    icon: Github,
    color: "#000000",
  },
  {
    id: 5,
    source: "google",
    sender: "Google Cloud",
    subject: "Bill estimate",
    time: "4w ago",
    icon: Chrome,
    color: "#ea4335",
  },
];

const SUGGESTED_ITEMS = [
  {
    id: 1,
    title: "Connect a new account",
    type: "watch",
    meta: "2m watch",
    image: "🔗",
  },
  {
    id: 2,
    title: "Create automation rules",
    type: "read",
    meta: "5m read",
    image: "⚡",
  },
  {
    id: 3,
    title: "Customize your inbox",
    type: "read",
    meta: "9m read",
    image: "🎨",
  },
];

const MailCard = ({ email }) => (
  <div className="min-w-50 w-50 h-35 bg-bg-sidebar rounded-lg p-4 flex flex-col justify-between cursor-pointer transition-colors hover:bg-bg-hover active:scale-98 border border-transparent flex-shrink-0">
    <div className="flex items-start">
      <email.icon size={24} style={{ color: email.color }} />
    </div>
    <div className="flex-1 flex flex-col">
      <div className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug mb-1">
        {email.subject}
      </div>
      <div className="text-xs text-text-tertiary truncate">{email.sender}</div>
    </div>
    <div className="flex items-center gap-2 mt-3">
      <div
        className="w-4 h-4 rounded-full text-white text-xs font-medium flex items-center justify-center"
        style={{ backgroundColor: email.color }}
      >
        {email.sender[0]}
      </div>
      <span className="text-xs text-text-tertiary">{email.time}</span>
    </div>
  </div>
);

const LearnCard = ({ item }) => (
  <div className="min-w-70 w-70 h-50 bg-bg-sidebar rounded-lg overflow-hidden flex flex-col cursor-pointer transition-colors hover:bg-bg-hover flex-shrink-0 border border-border-subtle relative">
    <div className="h-30 bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center text-text-tertiary">
      <span className="text-6xl">{item.image}</span>
    </div>
    <div className="px-4 pt-4 flex-1">
      <div className="text-sm font-semibold text-text-primary mb-1">
        {item.title}
      </div>
    </div>
    <div className="px-4 pb-4 flex items-center gap-1.5 text-xs text-text-tertiary">
      {item.type === "watch" ? <PlayCircle size={12} /> : <Book size={12} />}
      {item.meta}
    </div>
  </div>
);

/**
 * MailReceiverPage — Nội dung trang hộp thư.
 * Layout (Sidebar + outer container) được xử lý bởi DashboardLayout.
 */
export function MailReceiverPage() {
  return (
    <div className="flex flex-col h-full w-full bg-bg-main text-text-primary overflow-y-auto">
      <div className="flex-1 px-12 py-8 max-w-5xl w-full mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-text-primary">
          Good evening, Thành Luân
        </h1>

        {/* Section 1: Recent Emails */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-text-secondary flex items-center gap-2">
              <Clock size={16} />
              Recently received
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-border-subtle">
            {RECENT_EMAILS.map((email) => (
              <MailCard key={email.id} email={email} />
            ))}
          </div>
        </div>

        {/* Section 2: Suggested */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-text-secondary flex items-center gap-2">
              <BookOpen size={16} />
              Suggested for you
            </div>
            <MoreHorizontal
              size={16}
              className="text-text-tertiary cursor-pointer"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-border-subtle">
            {SUGGESTED_ITEMS.map((item) => (
              <LearnCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
