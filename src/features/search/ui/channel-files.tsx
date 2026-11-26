import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import { useMessages } from "@/features/messages"
import { useMemberNames } from "@/features/messages/hooks/use-member-names"
import { toast } from "@/lib/toast"

import { searchAttachments } from "../fetchers/search-fetchers"
import type { AttachmentSearchResult } from "../types"
import { describeSearchError } from "../utils/errors"
import { FileResult } from "./file-result"

const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" })

type Status = "loading" | "loaded" | "error"

export type ChannelFilesProps = {
  teamId: string
  channelId: string
  /** Closes the details panel: on small screens it covers the message the user jumps to. */
  onClose: () => void
}

/** A conversation's files, newest first, as GET /search/attachments without words gives them. */
export function ChannelFiles({ teamId, channelId, onClose }: ChannelFilesProps) {
  const { user } = useAuth()
  const { jumpTo } = useMessages()
  const [files, setFiles] = useState<AttachmentSearchResult[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [error, setError] = useState("")
  const requestRef = useRef<AbortController | null>(null)

  // Sets state only once the answer is in, so the effect below never sets state synchronously.
  const fetchPage = useCallback(
    (cursor: string | undefined, signal: AbortSignal) =>
      searchAttachments(teamId, undefined, { in: channelId }, cursor, signal).then(
        (page) => {
          setFiles((previous) => (cursor ? [...previous, ...page.results] : page.results))
          setNextCursor(page.next_cursor)
          setStatus("loaded")
        },
        (failure: unknown) => {
          if (signal.aborted) return
          setError(describeSearchError(failure, !!cursor))
          setStatus("error")
        },
      ),
    [teamId, channelId],
  )

  useEffect(() => {
    const controller = new AbortController()
    requestRef.current = controller
    void fetchPage(undefined, controller.signal)
    return () => controller.abort()
  }, [fetchPage])

  /** Try again, or the next page with a cursor. */
  const load = (cursor?: string) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setStatus("loading")
    void fetchPage(cursor, controller.signal)
  }

  const authorIds = useMemo(() => [...new Set(files.map((f) => f.message.author_id))], [files])
  const names = useMemberNames(teamId, authorIds)

  const goToMessage = async ({ message }: AttachmentSearchResult) => {
    if (!(await jumpTo(message.channel_id, message.id, message.seq))) {
      toast.error("Couldn't load this message. Try again.")
      return
    }
    if (window.matchMedia("(max-width: 767px)").matches) onClose()
  }

  if (status === "loading" && files.length === 0) {
    return (
      <span role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Loading files…
      </span>
    )
  }

  if (status === "error" && files.length === 0) {
    return (
      <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 text-center">
        <strong className="font-semibold">{error}</strong>
        <Button variant="secondary" size="sm" onClick={() => load()}>
          Try again
        </Button>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        No files yet. Files sent here show up in this list.
      </p>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-[9px]" aria-label="Files" aria-busy={status === "loading"}>
        {files.map((file) => (
          <FileResult
            key={file.attachment.file_id}
            result={file}
            header={
              <>
                <strong className="truncate font-semibold text-foreground">
                  {file.message.author_id === user?.id
                    ? "You"
                    : (names[file.message.author_id] ?? "Unknown member")}
                </strong>
                <time dateTime={file.message.created_at} className="shrink-0">
                  {dateFormat.format(new Date(file.message.created_at))}
                </time>
              </>
            }
            onGoToMessage={() => void goToMessage(file)}
          />
        ))}
      </ul>
      {nextCursor && (
        <div className="flex justify-center pt-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={status === "loading"}
            onClick={() => load(nextCursor)}
          >
            {status === "loading" ? "Loading…" : "More files"}
          </Button>
        </div>
      )}
      {status === "error" && (
        <p role="alert" className="pt-2 text-center text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  )
}
