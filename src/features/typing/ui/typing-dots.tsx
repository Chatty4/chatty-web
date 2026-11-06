const DELAYS = ["0ms", "160ms", "320ms"]

/** Three dots that bounce one after the other. Still when the user asks for less motion. */
export function TypingDots() {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1">
      {DELAYS.map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-typing-dot rounded-full bg-muted-foreground motion-reduce:animate-none"
          style={{ animationDelay: delay }}
        />
      ))}
    </span>
  )
}
