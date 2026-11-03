import { Combobox } from "@base-ui/react/combobox"
import { ChevronDown } from "lucide-react"
import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"

// ── Build timezone list once ──────────────────────────────────────────────────

function tzOffset(tz: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date())
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC"
}

const TIMEZONES = Intl.supportedValuesOf("timeZone").map((tz) => ({
  value: tz,
  label: `(${tzOffset(tz)}) ${tz}`,
}))

// ── Component ─────────────────────────────────────────────────────────────────

type TimezoneSelectProps = {
  id?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
  value: string
  onChange: (value: string | null) => void
}

export function TimezoneSelect({
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  value,
  onChange,
}: TimezoneSelectProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query) return TIMEZONES
    const q = query.toLowerCase()
    return TIMEZONES.filter((tz) => tz.label.toLowerCase().includes(q))
  }, [query])

  return (
    <Combobox.Root
      value={value}
      onValueChange={onChange}
      onInputValueChange={(inputVal) => setQuery(inputVal)}
      itemToStringLabel={(val) => TIMEZONES.find((t) => t.value === val)?.label ?? (val as string)}
    >
      <Combobox.InputGroup className="relative flex h-[34px] w-full items-center rounded-sm border border-input bg-surface transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-2 focus-within:ring-accent">
        <Combobox.Input
          id={id}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className="min-w-0 flex-1 bg-transparent pl-2.5 pr-8 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Combobox.Trigger className="absolute right-0 flex h-full cursor-pointer items-center px-2.5 text-muted-foreground outline-none">
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50 outline-none">
          <Combobox.Popup className="max-h-60 w-[var(--anchor-width)] overflow-y-auto rounded-md border bg-popover p-1 shadow-[0_8px_24px_var(--shadow)] outline-none">
            {filtered.length === 0 ? (
              <div className="px-2 py-1.5 text-[13px] text-muted-foreground">No timezones found.</div>
            ) : (
              filtered.map((tz) => (
                <Combobox.Item
                  key={tz.value}
                  value={tz.value}
                  className={cn(
                    "flex h-8 cursor-pointer items-center rounded-sm px-2 text-[13px] text-foreground outline-none select-none",
                    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                  )}
                >
                  {tz.label}
                </Combobox.Item>
              ))
            )}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
