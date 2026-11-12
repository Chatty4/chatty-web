import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast"

import { usePush } from "../hooks/use-push"
import type { PushStatus } from "../types"

const DESCRIPTIONS: Record<PushStatus | "loading", string> = {
  loading: "Checking this browser…",
  unsupported: "This browser can't show push notifications.",
  unconfigured: "Push notifications aren't set up for this Chatty server.",
  blocked: "Notifications are blocked for Chatty. Allow them in your browser's site settings, then reload.",
  off: "Get a notification for new messages while Chatty isn't on screen.",
  on: "On for this browser. You get new messages, by each channel's notification setting, while Chatty isn't on screen.",
}

/** Account settings section: browser push notifications (CHAT-219). */
export function NotificationsSection() {
  const { status, busy, turnOn, turnOff } = usePush()

  const toggle = async () => {
    try {
      await (status === "on" ? turnOff() : turnOn())
    } catch {
      toast.error("Could not change notifications. Please try again.")
    }
  }

  const canToggle = status === "on" || status === "off"

  return (
    <section className="flex flex-col gap-[18px] rounded-md border border-border bg-surface p-[22px]">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="text-sm font-semibold">Notifications</strong>
          <span className="text-[13px] text-muted-foreground">{DESCRIPTIONS[status]}</span>
        </div>
        {canToggle && (
          <Button variant={status === "on" ? "secondary" : "default"} disabled={busy} onClick={toggle}>
            {busy ? "Saving…" : status === "on" ? "Turn off" : "Turn on"}
          </Button>
        )}
      </div>
    </section>
  )
}
