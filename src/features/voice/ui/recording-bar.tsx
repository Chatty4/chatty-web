import { useEffect, useRef } from "react"
import { Check, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { RecorderStatus } from "../hooks/use-audio-recorder"
import { formatDuration, MAX_RECORDING_MS } from "../utils/recording"

type RecordingBarProps = {
  status: Exclude<RecorderStatus, "idle">
  elapsedMs: number
  /** Stops and attaches the recording to the message. */
  onStop: () => void
  /** Throws the recording away. */
  onCancel: () => void
}

/** Takes the place of the composer's toolbar while a voice message is recorded. */
export function RecordingBar({ status, elapsedMs, onStop, onCancel }: RecordingBarProps) {
  const recording = status === "recording"
  const doneRef = useRef<HTMLButtonElement>(null)

  // The mic button that started this is gone, so the focus moves to Done.
  useEffect(() => {
    if (recording) doneRef.current?.focus()
  }, [recording])

  return (
    <div
      role="group"
      aria-label="Voice message"
      className="flex items-center justify-between gap-2 px-2 pb-2 pt-1"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        event.preventDefault()
        onCancel()
      }}
    >
      <div className="flex min-w-0 items-center gap-2 pl-1 text-sm">
        <span
          aria-hidden="true"
          className={
            recording
              ? "size-2.5 shrink-0 rounded-full bg-destructive motion-safe:animate-pulse"
              : "size-2.5 shrink-0 rounded-full bg-faint-foreground"
          }
        />
        <span role="status" className="truncate">
          {recording ? "Recording" : "Waiting for the microphone…"}
        </span>
        {recording && (
          <span className="text-muted-foreground tabular-nums">
            {formatDuration(elapsedMs)} / {formatDuration(MAX_RECORDING_MS)}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Discard recording" onClick={onCancel}>
          <Trash2 />
        </Button>
        <Button
          ref={doneRef}
          size="sm"
          aria-label="Stop and attach the recording"
          disabled={!recording}
          onClick={onStop}
        >
          <Check />
          Done
        </Button>
      </div>
    </div>
  )
}
