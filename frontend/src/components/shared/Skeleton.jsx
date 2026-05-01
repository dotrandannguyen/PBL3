import React from "react";

/**
 * Skeleton — Shimmering placeholder block.
 * Uses the global `.skeleton-shimmer` class defined in index.css.
 */
export default function Skeleton({
  className = "",
  width,
  height = "1rem",
  rounded = "md",
  style = {},
}) {
  const radiusMap = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };
  const radiusClass = radiusMap[rounded] ?? radiusMap.md;

  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer ${radiusClass} ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

/**
 * SkeletonText — Stack of N skeleton bars used for text-block placeholders.
 */
export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.75rem"
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonRow — A row preset matching task/inbox list density.
 */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton width="1rem" height="1rem" rounded="sm" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton height="0.75rem" width="65%" />
        <Skeleton height="0.625rem" width="35%" />
      </div>
      <Skeleton width="3rem" height="1.25rem" rounded="full" />
    </div>
  );
}

/**
 * SkeletonList — Convenience: N rows wrapped in a flex column.
 */
export function SkeletonList({ rows = 6 }) {
  return (
    <div className="flex flex-col divide-y divide-border-subtle/40">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
