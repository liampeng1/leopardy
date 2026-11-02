"use client";

import { useState } from "react";
import { Player } from "@/lib/types";
import { money } from "./CreditPicker";

export function Scoreboard({
  players,
  control,
  orientation = "horizontal",
  onRename,
  onRemove,
  onAdd,
  onAdjust,
}: {
  players: Player[];
  control?: string | null;
  orientation?: "horizontal" | "vertical";
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onAdjust: (id: string, delta: number) => void;
}) {
  const vertical = orientation === "vertical";

  if (vertical) {
    // Side rail: players stack down the column beside the board, separated by
    // black gutters; a wood base fills whatever rail space is left over.
    return (
      <div className="flex flex-col gap-1.5 h-full">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            vertical
            isControl={control === p.id}
            onRename={onRename}
            onRemove={onRemove}
            onAdjust={onAdjust}
          />
        ))}
        <button
          onClick={onAdd}
          className="cat-header rounded-md py-2 shrink-0 flex items-center justify-center gap-1 text-white/70 hover:text-white transition"
          aria-label="Add player"
        >
          <span className="text-2xl leading-none">＋</span>
        </button>
        {/* Wooden stage deck the podiums stand on — fills the leftover rail
            space, matching the set's walnut cornice up top. */}
        <div className="wood-trim flex-1 min-h-0 rounded-md" aria-hidden />
      </div>
    );
  }

  // Keep podiums readable: one row up to 5 players, then wrap into balanced rows
  // (max 5 per row) so a full ten-player game still shows every name.
  const cols =
    players.length <= 5
      ? Math.max(players.length, 1)
      : Math.min(5, Math.ceil(players.length / 2));

  return (
    <div className="flex items-stretch gap-2">
      <div
        className="flex-1 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            isControl={control === p.id}
            onRename={onRename}
            onRemove={onRemove}
            onAdjust={onAdjust}
          />
        ))}
      </div>
      <button
        onClick={onAdd}
        className="cat-header rounded-md px-3 shrink-0 flex items-center justify-center gap-1 text-white/70 hover:text-white transition"
        aria-label="Add player"
      >
        <span className="text-2xl leading-none">＋</span>
      </button>
    </div>
  );
}

function PlayerCard({
  player,
  vertical = false,
  isControl,
  onRename,
  onRemove,
  onAdjust,
}: {
  player: Player;
  vertical?: boolean;
  isControl: boolean;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onAdjust: (id: string, delta: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const negative = player.score < 0;

  const nameField = editing ? (
    <input
      autoFocus
      defaultValue={player.name}
      onBlur={(e) => {
        onRename(player.id, e.target.value.trim() || player.name);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-full min-w-0 bg-black/25 rounded px-1 outline-none text-center podium-name text-3xl sm:text-4xl"
    />
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="w-full min-w-0 text-center podium-name text-3xl sm:text-5xl leading-none hover:text-gold-bright transition truncate"
      title="Click to rename"
    >
      {player.name}
    </button>
  );

  const adjustButtons = (
    <div className="hidden group-hover:flex gap-1 shrink-0">
      <button
        onClick={() => onAdjust(player.id, -100)}
        className="px-2 py-0.5 rounded text-xs font-ui text-white/70 hover:text-wrong bg-black/35"
      >
        −
      </button>
      <button
        onClick={() => onAdjust(player.id, 100)}
        className="px-2 py-0.5 rounded text-xs font-ui text-white/70 hover:text-correct bg-black/35"
      >
        ＋
      </button>
    </div>
  );

  const score = (
    <span
      className={`font-display tabular-nums shrink-0 leading-none ${
        vertical ? "text-3xl sm:text-4xl" : "text-2xl sm:text-4xl"
      } ${negative ? "score-neg" : "score-pos"}`}
    >
      {money(player.score)}
    </span>
  );

  const removeButton = (
    <button
      onClick={() => onRemove(player.id)}
      aria-label={`Remove ${player.name}`}
      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-wrong/90 text-white text-xs opacity-0 group-hover:opacity-100 transition"
    >
      ✕
    </button>
  );

  // Only the controlling player (who picks next) gets a highlight — the big
  // amber score already shows who's ahead, so no separate leader marker.
  const outlineStyle = {
    outline: isControl ? "3px solid var(--gold)" : undefined,
    outlineOffset: isControl ? ("-3px" as const) : undefined,
  };

  const controlBadge = isControl && (
    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold-bright text-[#0a1046] font-ui font-bold text-[0.65rem] uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
      ▶ Picks next
    </span>
  );

  if (vertical) {
    // Side rail: hand-lettered name on top, gold score below, centered so each
    // player reads clearly in a narrow column.
    return (
      <div
        className="podium group relative px-4 py-3 shrink-0 flex flex-col items-center gap-1 text-center"
        style={outlineStyle}
      >
        {controlBadge}
        {nameField}
        {score}
        {adjustButtons}
        {removeButton}
      </div>
    );
  }

  return (
    <div
      className="podium group relative px-4 py-2 flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 text-center"
      style={outlineStyle}
    >
      {controlBadge}
      {nameField}
      {score}
      {adjustButtons}
      {removeButton}
    </div>
  );
}
