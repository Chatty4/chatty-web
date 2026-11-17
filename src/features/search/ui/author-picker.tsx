import { Combobox } from "@base-ui/react/combobox"
import { ChevronDown, Loader2, Search } from "lucide-react"
import { useEffect, useState } from "react"

import { searchTeamMembersRequest } from "@/features/teams/fetchers/team-fetchers"
import type { TeamMember } from "@/features/teams/types"
import { cn } from "@/lib/utils"

/** Wait for a pause in typing before asking the server. */
const DEBOUNCE_MS = 250

export type Author = { id: string; name: string }

type AuthorPickerProps = {
  teamId: string
  myId: string | undefined
  /** null: anyone. */
  value: Author | null
  onChange: (author: Author | null) => void
}

const ANYONE = ""

const itemClass = cn(
  "flex h-8 cursor-pointer items-center rounded-sm px-2 text-[13px] text-foreground outline-none select-none",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
)

/** The From filter: type a name to find a team member, without loading the whole team. */
export function AuthorPicker({ teamId, myId, value, onChange }: AuthorPickerProps) {
  const [query, setQuery] = useState("")
  const [found, setFound] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)

  const q = query.trim()
  // The input shows the picked name too: that isn't a new search.
  const searching = q !== "" && q !== value?.name

  useEffect(() => {
    if (!searching) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      searchTeamMembersRequest(teamId, q, controller.signal)
        .then((members) => setFound(members.filter((m) => m.is_active && m.user_id !== myId)))
        .catch(() => {
          if (!controller.signal.aborted) setFound([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [teamId, q, searching, myId])

  const label = (id: string) => {
    // Empty, so the placeholder shows and typing starts a search right away.
    if (id === ANYONE) return ""
    if (id === myId) return "Me"
    return found.find((m) => m.user_id === id)?.display_name ?? value?.name ?? ""
  }

  const pick = (id: string | null) => {
    if (!id) return onChange(null)
    onChange({ id, name: label(id) })
  }

  return (
    <Combobox.Root
      value={value?.id ?? ANYONE}
      onValueChange={(id) => pick(id as string | null)}
      onInputValueChange={setQuery}
      itemToStringLabel={(id) => label(id as string)}
    >
      <Combobox.InputGroup className="relative flex h-[34px] w-full items-center rounded-sm border border-input bg-surface transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-2 focus-within:ring-accent">
        <Search
          className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        <Combobox.Input
          aria-label="From"
          placeholder="Search people"
          // A picked name is selected on focus, so typing replaces it.
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent pr-8 pl-8 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Combobox.Trigger
          aria-label="Show options"
          className="absolute right-0 flex h-full cursor-pointer items-center px-2.5 text-muted-foreground outline-none"
        >
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50 outline-none">
          <Combobox.Popup className="max-h-72 w-[var(--anchor-width)] overflow-y-auto rounded-md border bg-popover p-1 shadow-[0_8px_24px_var(--shadow)] outline-none">
            <Combobox.Item value={ANYONE} className={itemClass}>
              Anyone
            </Combobox.Item>
            {myId && (
              <Combobox.Item value={myId} className={itemClass}>
                Me
              </Combobox.Item>
            )}
            <div className="my-1 h-px bg-border" role="separator" />
            {!searching ? (
              <div className="px-2 py-1.5 text-[13px] text-muted-foreground">
                Type a name to find someone.
              </div>
            ) : loading && found.length === 0 ? (
              <div role="status" className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Searching…
              </div>
            ) : found.length === 0 ? (
              <div className="px-2 py-1.5 text-[13px] text-muted-foreground">No one found.</div>
            ) : (
              found.map((m) => (
                <Combobox.Item key={m.user_id} value={m.user_id} className={itemClass}>
                  <span className="truncate">{m.display_name}</span>
                </Combobox.Item>
              ))
            )}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
