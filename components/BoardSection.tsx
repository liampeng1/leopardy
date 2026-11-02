import { ReactNode } from "react";

/**
 * A board-styled section: a textured category-header cell (white uppercase,
 * like the board's category cells) above a matching textured body cell,
 * separated by a thin black gutter — mirroring the play board. Both surfaces use
 * the same lit-navy noise treatment as the live board (.cat-header /
 * .board-surface) so Setup steps and Results sections read like the board.
 */
export function BoardSection({
  title,
  aside,
  children,
  bodyClassName = "",
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="space-y-1">
      <div className="cat-header rounded-lg px-5 sm:px-6 py-3 flex items-baseline justify-between gap-3">
        <h2 className="font-clue font-bold uppercase tracking-wide text-white text-xl sm:text-2xl leading-none">
          {title}
        </h2>
        {aside != null && (
          <span className="font-ui text-ink-dim text-base sm:text-lg shrink-0">
            {aside}
          </span>
        )}
      </div>
      <div className={`board-surface rounded-lg px-4 sm:px-6 py-5 ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
