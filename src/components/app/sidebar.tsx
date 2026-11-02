import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { BrandMark } from "./brand-mark"
import { UserMenu } from "./user-menu"

type SidebarProps = {
  /** Open as a drawer on small screens. Always shown from md up. */
  open: boolean
  onClose: () => void
}

/** The workspace column: teams, channels and DMs (CHAT-193, CHAT-194), and the user menu. */
export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-overlay md:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <aside
        aria-label="Workspace"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r bg-background transition-transform md:static md:z-auto md:translate-x-0",
          open ? "translate-x-0 shadow-[0_8px_28px_var(--shadow)]" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-3">
          <BrandMark className="size-7 rounded-sm md:hidden" />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <strong className="truncate font-semibold">Chatty</strong>
            <small className="truncate text-[11px] text-muted-foreground">No team selected</small>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <X className="size-[18px]" />
          </Button>
        </div>

        <nav aria-label="Channels and direct messages" className="flex-1 overflow-y-auto px-2 pt-1 pb-4">
          <div className="px-2 text-xs font-semibold text-muted-foreground">Channels</div>
          <p className="px-2 pt-2 text-[13px] text-faint-foreground">
            Your teams and channels will show up here.
          </p>
        </nav>

        <div className="flex min-h-[66px] shrink-0 items-center border-t px-2 py-2.5">
          <UserMenu />
        </div>
      </aside>
    </>
  )
}
