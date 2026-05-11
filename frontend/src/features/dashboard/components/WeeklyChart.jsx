import React from "react";
import { useLanguage } from "../../../contexts/LanguageContext";

const WeeklyChart = ({ data = [] }) => {
  const { t } = useLanguage();
  const max = Math.max(1, ...data.map((d) => d.total));
  const dayLabels = [0, 1, 2, 3, 4, 5, 6].map((i) => t(`cal.day.${i}`));

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2 sm:gap-3 h-56">
        {data.map((day, idx) => {
          const totalH = (day.total / max) * 100;
          const doneH = day.total > 0 ? (day.done / day.total) * totalH : 0;
          return (
            <div key={idx} className="group flex-1 flex flex-col items-center justify-end h-full relative">
              <div className="absolute bottom-full mb-2 px-2 py-1 rounded-md bg-bg-sidebar border border-border-subtle text-[11px] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
                <div className="font-medium">{day.done}/{day.total} task</div>
                <div className="text-text-tertiary">{day.label}</div>
              </div>

              <div
                className="relative w-full max-w-[44px] rounded-t-lg bg-border-subtle/50 overflow-hidden transition-all duration-500 ease-out group-hover:max-w-[52px]"
                style={{ height: `${totalH}%`, minHeight: day.total > 0 ? 6 : 2 }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-accent-primary to-emerald-400 transition-all duration-700 ease-out"
                  style={{ height: `${(doneH / Math.max(totalH, 0.01)) * 100}%` }}
                />
              </div>

              <div className="mt-2 text-[11px] text-text-tertiary group-hover:text-text-primary transition-colors">
                {dayLabels[idx]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-6 text-xs text-text-tertiary">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-accent-primary to-emerald-400" />
          <span>{t("dashboard.done")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-border-subtle/50" />
          <span>{t("dashboard.notDone")}</span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyChart;
