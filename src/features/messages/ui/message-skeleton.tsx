import { cn } from "@/lib/utils"

const ROWS = [
  { own: false, widths: ["w-2/3", "w-1/3"] },
  { own: true, widths: ["w-1/3"] },
  { own: false, widths: ["w-1/2"] },
  { own: false, widths: ["w-3/4", "w-2/5"] },
  { own: true, widths: ["w-2/5", "w-1/4"] },
] as const

function Bar({ className }: { className: string }) {
  return <div className={cn("h-3 rounded-sm bg-surface-hover", className)} />
}

/** Placeholder rows shown while a channel's first page of messages loads. */
export function MessageListSkeleton() {
  return (
    <div role="status" aria-label="Loading messages" className="flex animate-pulse flex-col gap-5 px-4 py-4">
      {ROWS.map((row, i) =>
        row.own ? (
          <div key={i} className="flex flex-col items-end gap-1.5">
            <Bar className="w-10" />
            {row.widths.map((w, j) => (
              <div key={j} className={cn("h-8 rounded-lg bg-accent/70", w)} />
            ))}
          </div>
        ) : (
          <div key={i} className="flex gap-2.5">
            <div className="size-8 shrink-0 rounded-full bg-surface-hover" />
            <div className="flex flex-1 flex-col gap-2 pt-0.5">
              <div className="flex gap-2">
                <Bar className="w-24" />
                <Bar className="w-10" />
              </div>
              {row.widths.map((w, j) => (
                <Bar key={j} className={w} />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  )
}
