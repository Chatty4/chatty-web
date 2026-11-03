import { Popover } from "@base-ui/react/popover"
import {
  EmojiPicker as Picker,
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
} from "frimousse"
import { Smile } from "lucide-react"
import { type RefObject, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import { Button } from "./button"

function CategoryHeader({ category, className, ...props }: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      {...props}
      className={cn("bg-surface px-3 pt-3 pb-1.5 text-xs font-medium text-muted-foreground", className)}
    >
      {category.label}
    </div>
  )
}

function Row({ children, className, ...props }: EmojiPickerListRowProps) {
  return (
    <div {...props} className={cn("scroll-my-1.5 px-1.5", className)}>
      {children}
    </div>
  )
}

function Emoji({ emoji, className, ...props }: EmojiPickerListEmojiProps) {
  return (
    <button
      {...props}
      className={cn(
        "grid size-8 place-items-center rounded-sm text-lg data-[active]:bg-surface-hover",
        className,
      )}
    >
      {emoji.emoji}
    </button>
  )
}

type EmojiPickerProps = {
  onSelect: (emoji: string) => void
  searchRef?: RefObject<HTMLInputElement | null>
  className?: string
}

/** Searchable emoji grid with categories and skin tones. */
export function EmojiPicker({ onSelect, searchRef, className }: EmojiPickerProps) {
  return (
    <Picker.Root
      columns={9}
      onEmojiSelect={({ emoji }) => onSelect(emoji)}
      className={cn("isolate flex h-[360px] w-[312px] flex-col bg-surface", className)}
    >
      <div className="flex items-center gap-1.5 border-b p-2">
        <Picker.Search
          ref={searchRef}
          aria-label="Search emoji"
          placeholder="Search emoji…"
          className="h-8 w-full rounded-sm border border-input bg-surface px-2.5 text-sm text-foreground outline-none placeholder:text-faint-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-accent"
        />
        <Picker.SkinToneSelector
          aria-label="Change skin tone"
          className="grid size-8 shrink-0 place-items-center rounded-sm text-lg hover:bg-surface-hover"
        />
      </div>
      <Picker.Viewport className="relative min-h-0 flex-1 outline-none">
        <Picker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </Picker.Loading>
        <Picker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          No emoji found.
        </Picker.Empty>
        <Picker.List className="pb-1.5 select-none" components={{ CategoryHeader, Row, Emoji }} />
      </Picker.Viewport>
      <div className="flex h-10 shrink-0 items-center gap-2 border-t px-3 text-xs text-muted-foreground">
        <Picker.ActiveEmoji>
          {({ emoji }) =>
            emoji ? (
              <>
                <span className="text-lg leading-none">{emoji.emoji}</span>
                <span className="truncate">{emoji.label}</span>
              </>
            ) : (
              <span>Pick an emoji…</span>
            )
          }
        </Picker.ActiveEmoji>
      </div>
    </Picker.Root>
  )
}

type EmojiPickerButtonProps = {
  onSelect: (emoji: string) => void
  disabled?: boolean
  /** Element to focus after the picker closes (e.g. the composer textarea). */
  returnFocusRef?: RefObject<HTMLElement | null>
}

/** Smiley button that opens the emoji picker in a popover. */
export function EmojiPickerButton({ onSelect, disabled, returnFocusRef }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Add emoji"
            disabled={disabled}
            className={open ? "bg-surface-hover text-foreground" : undefined}
          />
        }
      >
        <Smile />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8} className="z-50">
          <Popover.Popup
            initialFocus={searchRef}
            finalFocus={returnFocusRef ?? true}
            className="origin-[var(--transform-origin)] overflow-hidden rounded-md border bg-surface shadow-xl outline-none transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
          >
            <EmojiPicker
              searchRef={searchRef}
              onSelect={(emoji) => {
                onSelect(emoji)
                setOpen(false)
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
