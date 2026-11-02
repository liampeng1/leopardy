"use client";

import { GameState } from "@/lib/types";
import { computeTimelineWithFinal } from "@/lib/game";
import { money } from "./CreditPicker";

const W = 1000;
const CX0 = 96;
const CX1 = 860; // room on the right for end labels
const CY0 = 130;
const CY1 = 560;

// Harvest-parchment theme (70s game-show set materials): a warm printed
// scorecard rather than a dark panel. Chrome is drawn in earth tones.
const BG = "#efe1bd"; // parchment card
const RUST = "#a63f18"; // title / strong accent
const INK = "#4a3116"; // dark-brown body text
const INK_DIM = "#8a6a3a"; // muted brown (labels, round names)
const GRID = "#6b4e26"; // gridlines / boundaries (used with opacity)

/**
 * Darken a player's board color so it stays legible on the light parchment
 * background — same hue, mixed 60/40 toward dark brown. The podiums keep the
 * bright original; the chart uses this readable-on-light variant.
 */
function onLight(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return INK;
  const ch = (i: number) => parseInt(m.slice(i, i + 2), 16);
  const D = [0x3a, 0x24, 0x10];
  const mix = (c: number, i: number) => Math.round(c * 0.6 + D[i] * 0.4);
  return `rgb(${mix(ch(0), 0)},${mix(ch(2), 1)},${mix(ch(4), 2)})`;
}

/**
 * The score-progression chart: one line per player with a marker at every
 * scoring event (filled = correct, hollow = wrong), diamonds on Daily Double /
 * Final wagers with the ± swing labelled, dashed round boundaries with round
 * subtotals, and name + score end labels. Rendered on screen and exported to
 * an image, so it uses only inline styling and web-safe fonts.
 */
export function ScoreChart({ game }: { game: GameState }) {
  const players = game.players;
  const timeline = computeTimelineWithFinal(game);
  const N = Math.max(1, timeline.length - 1);
  const useLegend = players.length > 5;
  const H = CY1 + (useLegend ? 112 : 64);

  const all = timeline.flatMap((p) => players.map((pl) => p.scores[pl.id] ?? 0));
  let minV = Math.min(0, ...all);
  let maxV = Math.max(0, ...all);
  if (minV === maxV) {
    minV -= 1000;
    maxV += 1000;
  }
  const pad = (maxV - minV) * 0.08;
  minV -= pad;
  maxV += pad;

  const xAt = (i: number) => CX0 + (i / N) * (CX1 - CX0);
  const yAt = (v: number) => CY1 - ((v - minV) / (maxV - minV)) * (CY1 - CY0);
  const ticks = niceTicks(minV, maxV, 6);

  // Round boundaries (see original derivation): a segment spans history
  // [from, to); the boundary line sits midway between the flanking points.
  const segments: { name: string; from: number; to: number }[] = [];
  game.history.forEach((h, i) => {
    const last = segments[segments.length - 1];
    if (!last || last.name !== h.roundName) {
      if (last) last.to = i;
      segments.push({ name: h.roundName, from: i, to: game.history.length });
    }
  });

  // End labels: name + score pair per player, pushed apart then clamped.
  const LABEL_H = 46;
  const last = timeline[timeline.length - 1];
  const labels = players
    .map((p) => ({ p, y: yAt(last.scores[p.id] ?? 0) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) {
    labels[i].y = Math.max(labels[i].y, labels[i - 1].y + LABEL_H);
  }
  const bottom = CY1 - 18;
  for (let i = labels.length - 1; i >= 0; i--) {
    const cap = i === labels.length - 1 ? bottom : labels[i + 1].y - LABEL_H;
    labels[i].y = Math.min(labels[i].y, cap);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="block"
      xmlns="http://www.w3.org/2000/svg"
      fontFamily="Georgia, 'Times New Roman', serif"
    >
      <rect x="0" y="0" width={W} height={H} fill={BG} rx="18" />

      <text x={W / 2} y="48" textAnchor="middle" fontSize="36" fontWeight="800" fill={RUST}>
        {game.title.toUpperCase()}
      </text>
      <text x={W / 2} y="78" textAnchor="middle" fontSize="20" fontWeight="700" fill={INK_DIM} letterSpacing="2">
        SCORE PROGRESSION
      </text>

      {/* round bands: boundary lines + segment labels along the top */}
      {segments.map((seg, i) => (
        <g key={i}>
          {i > 0 && (
            <line
              x1={(xAt(seg.from) + xAt(seg.from + 1)) / 2}
              x2={(xAt(seg.from) + xAt(seg.from + 1)) / 2}
              y1={CY0 - 26}
              y2={CY1}
              stroke={GRID}
              strokeWidth="1.5"
              strokeDasharray="6 5"
              opacity="0.5"
            />
          )}
          <text
            x={(xAt(seg.from + 1) + xAt(seg.to)) / 2}
            y={CY0 - 10}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill={INK_DIM}
            letterSpacing="1.5"
          >
            {seg.name.toUpperCase()}
          </text>
        </g>
      ))}

      {/* gridlines + y labels */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={CX0}
            x2={CX1}
            y1={yAt(t)}
            y2={yAt(t)}
            stroke={GRID}
            strokeWidth={t === 0 ? 2 : 1}
            opacity={t === 0 ? 0.5 : 0.14}
          />
          <text x={CX0 - 12} y={yAt(t) + 6} textAnchor="end" fontSize="17" fill={INK_DIM}>
            {money(t)}
          </text>
        </g>
      ))}

      {/* vertical subdivisions: one faint rule per question (clue) answered */}
      {game.history.map((_, i) => (
        <line
          key={`v${i}`}
          x1={xAt(i + 1)}
          x2={xAt(i + 1)}
          y1={CY0}
          y2={CY1}
          stroke={GRID}
          strokeWidth="1"
          opacity="0.1"
        />
      ))}

      {/* round subtotals: each player's running score at every round boundary,
          printed on the parchment so the chart carries more score detail */}
      {segments.slice(0, -1).map((seg, si) =>
        players.map((p) => {
          const v = timeline[seg.to]?.scores[p.id] ?? 0;
          return (
            <text
              key={`${si}-${p.id}`}
              x={xAt(seg.to) - 6}
              y={yAt(v) - 8}
              textAnchor="end"
              fontSize="14"
              fontWeight="700"
              fill={onLight(p.color)}
              stroke={BG}
              strokeWidth="3"
              paintOrder="stroke"
            >
              {money(v)}
            </text>
          );
        }),
      )}

      {/* legend row (6+ players) */}
      {useLegend &&
        players.map((p, i) => {
          const slot = (CX1 - CX0) / players.length;
          const cx = CX0 + slot * (i + 0.5);
          const score = last.scores[p.id] ?? 0;
          return (
            <g key={p.id}>
              <circle cx={cx - 8} cy={CY1 + 36} r="6" fill={onLight(p.color)} />
              <text x={cx + 2} y={CY1 + 42} textAnchor="start" fontSize="16" fontWeight="800" fill={onLight(p.color)}>
                {p.name.toUpperCase().slice(0, 10)}
              </text>
              <text x={cx + 2} y={CY1 + 62} textAnchor="start" fontSize="15" fontWeight="700" fill={score < 0 ? RUST : INK}>
                {money(score)}
              </text>
            </g>
          );
        })}

      {/* one line per player: markers each event (filled=correct, hollow=wrong),
          diamonds + ± swing on DD/Final, end label */}
      {players.map((p) => {
        const col = onLight(p.color);
        const pts = timeline
          .map((tp) => `${xAt(tp.index)},${yAt(tp.scores[p.id] ?? 0)}`)
          .join(" ");
        const label = labels.find((l) => l.p.id === p.id)!;
        const lastScore = last.scores[p.id] ?? 0;
        return (
          <g key={p.id}>
            <polyline
              points={pts}
              fill="none"
              stroke={col}
              strokeWidth="4.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {game.history.map((h, i) => {
              const v = h.verdicts[p.id];
              if (!v) return null;
              const cx = xAt(i + 1);
              const cy = yAt(timeline[i + 1].scores[p.id] ?? 0);
              const right = v === "correct";
              if (h.dd || h.isFinal) {
                // Diamond on this player's DD / Final wager (filled = right),
                // with the ± point swing labelled beside it.
                const swing = (right ? 1 : -1) * h.value;
                return (
                  <g key={i}>
                    <path
                      d={`M ${cx} ${cy - 9} L ${cx + 9} ${cy} L ${cx} ${cy + 9} L ${cx - 9} ${cy} Z`}
                      fill={right ? col : BG}
                      stroke={col}
                      strokeWidth="3"
                    />
                    <text
                      x={cx}
                      y={cy - 16}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="800"
                      fill={col}
                      stroke={BG}
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {swing < 0 ? "−" : "+"}
                      {money(Math.abs(swing))}
                    </text>
                  </g>
                );
              }
              // Regular clue: filled dot = correct, hollow dot = wrong.
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="4.5"
                  fill={right ? col : BG}
                  stroke={col}
                  strokeWidth={right ? 0 : 2.5}
                />
              );
            })}
            <circle
              cx={xAt(last.index)}
              cy={yAt(lastScore)}
              r="7"
              fill={col}
              stroke={BG}
              strokeWidth="2"
            />
            {!useLegend && (
              <>
                <text x={CX1 + 16} y={label.y + 1} fontSize="20" fontWeight="800" fill={col}>
                  {p.name.toUpperCase()}
                </text>
                <text
                  x={CX1 + 16}
                  y={label.y + 22}
                  fontSize="18"
                  fontWeight="700"
                  fill={lastScore < 0 ? RUST : INK}
                >
                  {money(lastScore)}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* marker legend */}
      <g fontFamily="Georgia, serif">
        <circle cx={CX0 + 6} cy={H - 14} r="4.5" fill={INK} />
        <text x={CX0 + 18} y={H - 9} fontSize="15" fill={INK_DIM}>
          RIGHT
        </text>
        <circle cx={CX0 + 92} cy={H - 14} r="4.5" fill={BG} stroke={INK} strokeWidth="2.5" />
        <text x={CX0 + 104} y={H - 9} fontSize="15" fill={INK_DIM}>
          WRONG
        </text>
        <path
          d={`M ${CX0 + 196} ${H - 22} L ${CX0 + 204} ${H - 14} L ${CX0 + 196} ${H - 6} L ${CX0 + 188} ${H - 14} Z`}
          fill="none"
          stroke={INK}
          strokeWidth="2"
        />
        <text x={CX0 + 214} y={H - 9} fontSize="15" fill={INK_DIM}>
          DAILY DOUBLE / FINAL WAGER
        </text>
      </g>
    </svg>
  );
}

/** Pick ~count round tick values spanning [min,max]. */
function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min;
  const rawStep = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const out: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max; v += step) out.push(Math.round(v));
  if (!out.includes(0) && min < 0 && max > 0) out.push(0);
  return out;
}

/** Serialize an <svg> element to a PNG and trigger a download. */
export function downloadSvgAsPng(svg: SVGSVGElement, filename: string) {
  const vb = svg.viewBox.baseVal;
  const w = vb.width || svg.clientWidth || 1000;
  const h = vb.height || svg.clientHeight || 700;
  const xml = new XMLSerializer().serializeToString(svg);
  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.src = svgUrl;
}
