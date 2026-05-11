import React from "react";

const ProgressRing = ({
  value = 0,
  total = 0,
  size = 200,
  strokeWidth = 16,
  label = "",
}) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2383e2" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border-subtle"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-text-primary tracking-tight">{percent}%</span>
        <span className="text-xs text-text-tertiary mt-1 uppercase tracking-wider">{label}</span>
        <span className="text-xs text-text-secondary mt-2">
          {value}/{total} task
        </span>
      </div>
    </div>
  );
};

export default ProgressRing;
