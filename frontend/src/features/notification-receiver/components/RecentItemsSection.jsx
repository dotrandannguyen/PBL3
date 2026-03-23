import { RecentItemCard } from "./RecentItemCard";

/**
 * @component RecentItemsSection
 * Section hiển thị các tin nhắn/issue mới nhất (scroll ngang)
 * @param {Array} items - Mảng tin nhắn mới nhất (max 5)
 * @param {Function} onItemClick - Callback khi click vào card
 */
export function RecentItemsSection({ items, onItemClick }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-text-primary">Mới nhất</h2>
      </div>
      {/* Cuộn ngang nếu có nhiều card */}
      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
        {items.map((item) => (
          <RecentItemCard
            key={`recent-${item.id}`}
            item={item}
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}
