import { useMemo } from "react";
import type { FinanceData, Stats, ExpenseItem } from "@/types/finance";

const fmt = (v: number, currency: string) =>
  Math.round(v).toLocaleString("en-US") + " " + currency;

const fmtPct = (v: number, total: number) =>
  total > 0 ? Math.round(v / total * 100) + "%" : "0%";

interface Props {
  data: FinanceData;
  stats: Stats;
  showPercent?: boolean;
  currency?: string;
}

const getCategoryItemColor = (catColor: string, itemIndex: number, totalItems: number): string => {
  if (totalItems <= 1) return catColor;

  // Simple Hex to RGB
  let hex = catColor.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Convert RGB to HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  // Safe margin around base lightness: linear distribution from (l - 0.10) to (l + 0.10)
  const minL = Math.max(0.12, l - 0.10);
  const maxL = Math.min(0.88, l + 0.10);
  
  const newL = totalItems > 1 
    ? minL + (itemIndex / (totalItems - 1)) * (maxL - minL)
    : l;

  // Convert HSL back to RGB
  let newR, newG, newB;
  if (s === 0) {
    newR = newG = newB = newL; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
    const p = 2 * newL - q;
    newR = hue2rgb(p, q, h + 1/3);
    newG = hue2rgb(p, q, h);
    newB = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const str = Math.round(x * 255).toString(16);
    return str.length === 1 ? "0" + str : str;
  };

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
};

export default function SankeyChart({ data, stats, showPercent = false, currency = "€" }: Props) {
  const svgContent = useMemo(() => {
    const tot = stats.income;
    if (tot <= 0) return null;

    const visCats = stats.cats.filter((c) => c.total > 0);
    const remaining = stats.remaining > 0.01 ? stats.remaining : 0;
    const isOverspending = stats.remaining < -0.01;
    const deficit = isOverspending ? Math.abs(stats.remaining) : 0;

    const allEntries = [
      ...visCats.map((c) => ({ ...c, visItems: c.items.filter((i) => (i.value || 0) > 0) })),
      ...(remaining > 0
        ? [{ id: "_ue", name: "Remaining", color: "#4DB6AC", total: remaining, items: [] as ExpenseItem[], visItems: [] as ExpenseItem[] }]
        : []),
    ];

    const totalVal = allEntries.reduce((s, e) => s + e.total, 0);
    if (totalVal <= 0) return null;

    // For overspending, normalize using total expenses instead of income
    const normalizeTotal = isOverspending ? totalVal : tot;

    const NODE_W_INCOME = 3;
    const NODE_W_CAT = 5;
    const NODE_W_ITEM = 7;
    const CAT_GAP = 6;
    const ITEM_GAP = 8;
    const MIN_H = 16;

    const W = 1100;
    const colIncome = 160;
    const colCat = W * 0.38;
    const colItem = W * 0.72;

    const allItems: { entry: typeof allEntries[0]; item?: ExpenseItem | null; h: number }[] = [];
    allEntries.forEach((entry) => {
      if (entry.visItems.length > 0) {
        entry.visItems.forEach((item) => {
          allItems.push({ entry, item, h: 0 });
        });
      } else {
        allItems.push({ entry, item: null, h: 0 });
      }
    });

    const totalItemRows = allItems.length;
    const totalItemGaps = (totalItemRows - 1) * ITEM_GAP;
    const catTotalGaps = (allEntries.length - 1) * CAT_GAP;
    const catAvailH_base = 260;
    const catAvailH = Math.max(catAvailH_base, totalItemRows * (MIN_H + ITEM_GAP));
    const MT = 8;

    type CNode = { id: string; name: string; color: string; total: number; y: number; h: number; visItems: ExpenseItem[] };
    const catNodes: CNode[] = [];
    let cy = MT;
    const catAreaH = catAvailH - catTotalGaps;
    allEntries.forEach((entry) => {
      const proportion = entry.total / totalVal;
      const h = Math.max(proportion * catAreaH, MIN_H);
      catNodes.push({ id: entry.id, name: entry.name, color: entry.color, total: entry.total, y: cy, h, visItems: entry.visItems });
      cy += h + CAT_GAP;
    });

    const catTopY = catNodes[0].y;
    const catBotY = catNodes[catNodes.length - 1].y + catNodes[catNodes.length - 1].h;
    const catSpan = catBotY - catTopY;
    const incomeSpan = catSpan * 0.65;
    const itemSpan = catSpan * 1.3;
    const incomeCenterY = catTopY + catSpan / 2;
    const itemCenterY = incomeCenterY;
    const itemStartY = itemCenterY - itemSpan / 2;

    type INode = { id: string; name: string; value: number; color: string; y: number; h: number; catIdx: number };
    const itemNodes: INode[] = [];
    const itemAreaH = itemSpan - totalItemGaps;
    let iy = itemStartY;
    let itemIdx = 0;
    catNodes.forEach((cn, catIdx) => {
      if (cn.visItems.length > 0) {
        cn.visItems.forEach((item: ExpenseItem, itemSubIdx) => {
          const proportion = (item.value || 0) / totalVal;
          const h = Math.max(proportion * itemAreaH, MIN_H);
          itemNodes.push({
            id: item.id,
            name: item.name,
            value: item.value,
            color: getCategoryItemColor(cn.color, itemSubIdx, cn.visItems.length),
            y: iy,
            h,
            catIdx
          });
          iy += h + ITEM_GAP;
          itemIdx++;
        });
      } else {
        itemIdx++;
      }
    });

    const incomeY = incomeCenterY - incomeSpan / 2;
    const incomeH = incomeSpan;

    const allBottom = Math.max(catBotY, iy - ITEM_GAP, incomeY + incomeH);
    const H = allBottom + MT;

    const elements: JSX.Element[] = [];

    const flowPath = (
      x1: number, y1top: number, y1bot: number,
      x2: number, y2top: number, y2bot: number,
      color: string, opacity: number, key: string,
    ) => {
      const dx = x2 - x1;
      const cx1 = x1 + dx * 0.45;
      const cx2 = x2 - dx * 0.45;
      return (
        <path
          key={key}
          d={`M${x1},${y1top} C${cx1},${y1top} ${cx2},${y2top} ${x2},${y2top} L${x2},${y2bot} C${cx2},${y2bot} ${cx1},${y1bot} ${x1},${y1bot} Z`}
          fill={color}
          opacity={opacity}
        />
      );
    };

    const display = (val: number) => showPercent ? fmtPct(val, tot) : fmt(val, currency);

    const incomeColor = isOverspending ? "#E53935" : "hsl(220,70%,55%)";
    elements.push(
      <rect key="income-bar" x={colIncome} y={incomeY} width={NODE_W_INCOME} height={incomeH} fill={incomeColor} rx={3} />,
    );

    const incomeName = data.income.length === 1 ? data.income[0].name : "Income";
    elements.push(
      <text key="il" x={colIncome - 12} y={incomeY + incomeH / 2} textAnchor="end" dominantBaseline="middle" fontSize="13" fontWeight="600" className={isOverspending ? "fill-destructive" : "fill-foreground"} fontFamily="'Space Grotesk',sans-serif">
        {incomeName}: {display(tot)} {isOverspending && "⚠️"}
      </text>,
    );

    // Add deficit indicator if overspending
    if (isOverspending) {
      elements.push(
        <text key="deficit-warning" x={colIncome - 12} y={incomeY + incomeH / 2 + 18} textAnchor="end" dominantBaseline="middle" fontSize="10" className="fill-destructive" fontFamily="'Space Grotesk',sans-serif">
          Deficit: {display(deficit)}
        </text>,
      );
    }

    let incomeOff = incomeY;
    catNodes.forEach((cn, i) => {
      const flowH = (cn.total / (isOverspending ? totalVal : tot)) * incomeH;
      elements.push(flowPath(
        colIncome + NODE_W_INCOME, incomeOff, incomeOff + flowH,
        colCat, cn.y, cn.y + cn.h,
        cn.color, 0.28, `flow-ic-${i}`,
      ));
      incomeOff += flowH;
    });

    catNodes.forEach((cn, catIdx) => {
      elements.push(
        <rect key={`cb-${cn.id}`} x={colCat} y={cn.y} width={NODE_W_CAT} height={cn.h} fill={cn.color} rx={3} />,
      );

      const catItems = itemNodes.filter((n) => n.catIdx === catIdx);

      if (catItems.length > 0) {
        elements.push(
          <text key={`cl-${cn.id}`} x={colCat + NODE_W_CAT + 12} y={cn.y + cn.h / 2} dominantBaseline="middle" fontSize="12" fontWeight="600" className="fill-foreground" fontFamily="'Space Grotesk',sans-serif">
            {cn.name}: {display(cn.total)}
          </text>,
        );

        const catItemTotal = catItems.reduce((s, it) => s + (it.value || 0), 0);
        let catFlowOff = cn.y;
        catItems.forEach((item, idx) => {
          const flowProp = catItemTotal > 0 ? (item.value / catItemTotal) * cn.h : cn.h / catItems.length;
          elements.push(flowPath(
            colCat + NODE_W_CAT, catFlowOff, catFlowOff + flowProp,
            colItem, item.y, item.y + item.h,
            item.color, 0.22, `flow-ci-${cn.id}-${idx}`,
          ));
          catFlowOff += flowProp;

          elements.push(
            <rect key={`ib-${item.id}`} x={colItem} y={item.y + 1} width={NODE_W_ITEM} height={item.h - 2} fill={item.color} rx={3} />,
          );

          elements.push(
            <text key={`itl-${item.id}`} x={colItem + NODE_W_ITEM + 16} y={item.y + item.h / 2} dominantBaseline="middle" fontSize="11.5" className="fill-foreground">
              {item.name}: <tspan fontWeight="600">{display(item.value)}</tspan>
            </text>,
          );
        });
      } else {
        elements.push(
          <text key={`cl-${cn.id}`} x={colCat + NODE_W_CAT + 12} y={cn.y + cn.h / 2} dominantBaseline="middle" fontSize="12" fontWeight="600" className="fill-foreground">
            {cn.name}: {display(cn.total)}
          </text>,
        );
      }
    });

    return { W, H, elements };
  }, [data, stats, showPercent, currency]);

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No data available
      </div>
    );
  }
  return (
    <div className="w-full h-full overflow-x-auto overflow-y-auto scrollbar-thin flex md:items-center md:justify-center items-start justify-start p-2">
      <div className="w-full h-full min-w-[850px] md:min-w-0 flex-shrink-0">
        <svg viewBox={`0 0 ${svgContent.W} ${svgContent.H}`} className="w-full h-full max-h-full" preserveAspectRatio="xMidYMid meet">
          {svgContent.elements}
        </svg>
      </div>
    </div>
  );
}
