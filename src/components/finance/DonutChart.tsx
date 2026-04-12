import { useMemo } from "react";
import type { FinanceData, Stats } from "@/types/finance";

interface Props {
  data: FinanceData;
  stats: Stats;
  currency?: string;
}

export default function DonutChart({ data, stats, currency = "€" }: Props) {
  const { segments, total, centerText, centerLabel } = useMemo(() => {
    const fmt = (v: number) => Math.round(v).toLocaleString("en-US") + " " + currency;

    // Flatten all items from all categories
    const allItems: { id: string; name: string; value: number; color: string; catName: string }[] = [];
    let totalExpenses = 0;

    stats.cats.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.value > 0) {
          allItems.push({
            id: item.id,
            name: item.name,
            value: item.value,
            color: cat.color,
            catName: cat.name,
          });
          totalExpenses += item.value;
        }
      });
    });

    const remaining = stats.income - totalExpenses;
    const isOverspending = remaining < 0;

    // Total for normalization - use actual total expenses so chart always fits 360°
    const totalForChart = totalExpenses + Math.max(0, remaining);

    let currentAngle = -90; // Start from top
    const segments = allItems.map((item) => {
      const angle = totalForChart > 0 ? (item.value / totalForChart) * 360 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      return {
        id: item.id,
        name: item.name,
        catName: item.catName,
        color: item.color,
        total: item.value,
        startAngle,
        endAngle,
        percentage: totalForChart > 0 ? Math.round((item.value / totalForChart) * 100) : 0,
      };
    });

    // Add remaining or deficit segment
    if (Math.abs(remaining) > 0.01) {
      const absRemaining = Math.abs(remaining);
      const angle = (absRemaining / totalForChart) * 360;
      segments.push({
        id: isOverspending ? "_deficit" : "_remaining",
        name: isOverspending ? "Deficit" : "Remaining",
        catName: "",
        color: isOverspending ? "#E53935" : "#4DB6AC",
        total: absRemaining,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        percentage: Math.round((absRemaining / totalForChart) * 100),
      });
    }

    return {
      segments,
      total: stats.income,
      totalExpenses,
      isOverspending,
      centerText: fmt(isOverspending ? totalExpenses : stats.income),
      centerLabel: isOverspending ? "Total Expenses" : "Total Income",
    };
  }, [data, stats, currency]);

  if (total <= 0 || segments.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  // Larger viewbox to accommodate labels
  const size = 600;
  const center = size / 2;
  const outerRadius = 150;
  const innerRadius = 85;
  const labelRadius = 220;

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const createArcPath = (
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(cx, cy, outerR, endAngle);
    const end = polarToCartesian(cx, cy, outerR, startAngle);
    const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
    const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${start.x} ${start.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 0 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}`,
      `Z`,
    ].join(" ");
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full max-w-[700px] max-h-[700px]"
        style={{ minWidth: "350px" }}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Segments */}
        {segments.map((seg) => (
          <g key={seg.id}>
            <path
              d={createArcPath(
                center,
                center,
                innerRadius,
                outerRadius,
                seg.startAngle,
                seg.endAngle
              )}
              fill={seg.color}
              stroke="hsl(var(--background))"
              strokeWidth="2"
              className="transition-all duration-300 hover:opacity-90 cursor-pointer"
            />
          </g>
        ))}

        {/* Center text */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground"
          fontSize="18"
          fontWeight="700"
          fontFamily="'Space Grotesk', sans-serif"
        >
          {centerText}
        </text>
        <text
          x={center}
          y={center + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground"
          fontSize="11"
          fontWeight="500"
          fontFamily="'Space Grotesk', sans-serif"
        >
          {centerLabel}
        </text>

        {/* Labels */}
        {segments.map((seg) => {
          const midAngle = (seg.startAngle + seg.endAngle) / 2;
          const pos = polarToCartesian(center, center, labelRadius, midAngle);
          const isRightSide = midAngle > -90 && midAngle < 90;

          // Calculate rotation angle for radial text
          const rotationAngle = midAngle + (isRightSide ? 0 : 180);

          // Skip labels for very small segments (< 1.5%)
          if (seg.percentage < 1.5) return null;

          return (
            <g key={`label-${seg.id}`}>
              <line
                x1={polarToCartesian(center, center, outerRadius + 3, midAngle).x}
                y1={polarToCartesian(center, center, outerRadius + 3, midAngle).y}
                x2={pos.x + (isRightSide ? 8 : -8)}
                y2={pos.y}
                stroke={seg.color}
                strokeWidth="1"
                opacity="0.5"
              />
              <text
                x={pos.x + (isRightSide ? 12 : -12)}
                y={pos.y - 6}
                textAnchor={isRightSide ? "start" : "end"}
                dominantBaseline="middle"
                className="fill-foreground"
                fontSize="11"
                fontWeight="600"
                fontFamily="'Space Grotesk', sans-serif"
                transform={`rotate(${rotationAngle} ${pos.x} ${pos.y})`}
              >
                {seg.name}
              </text>
              <text
                x={pos.x + (isRightSide ? 12 : -12)}
                y={pos.y + 8}
                textAnchor={isRightSide ? "start" : "end"}
                dominantBaseline="middle"
                className="fill-muted-foreground"
                fontSize="10"
                fontFamily="'Space Grotesk', sans-serif"
                transform={`rotate(${rotationAngle} ${pos.x} ${pos.y})`}
              >
                {seg.percentage}% · {seg.total.toLocaleString("en-US")} {currency}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
