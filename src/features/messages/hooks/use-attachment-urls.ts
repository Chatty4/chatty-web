import { useCallback, useEffect, useRef, useState } from "react"

import { getAttachmentUrlsApi } from "../fetchers/message-fetchers"
import type { AttachmentUrl } from "../types"
import { needsFreshUrl } from "../utils/attachments"

type Urls = Record<string, AttachmentUrl>

const byFileId = (attachments: AttachmentUrl[]): Urls =>
  Object.fromEntries(attachments.map((a) => [a.file_id, a]))

/**
 * The download URLs of a sent message's files, by file_id. Empty until they load, or when they
 * can't: the files then show without a link.
 */
// shortcut: one request per message with files as soon as it renders; load them when the
// message scrolls into view (useWhenVisible) if long histories of files get slow.
export function useAttachmentUrls(messageId: string, enabled: boolean) {
  const [urls, setUrls] = useState<Urls>({})
  const urlsRef = useRef<Urls>({})

  const store = useCallback((next: Urls) => {
    urlsRef.current = next
    setUrls(next)
  }, [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    getAttachmentUrlsApi(messageId)
      .then(({ attachments }) => {
        if (!cancelled) store(byFileId(attachments))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [enabled, messageId, store])

  /** Fetches the URLs again, for example after an image failed to load. */
  const reload = useCallback(async (): Promise<Urls> => {
    try {
      const next = byFileId((await getAttachmentUrlsApi(messageId)).attachments)
      store(next)
      return next
    } catch {
      return urlsRef.current
    }
  }, [messageId, store])

  /** A URL that works for a new load or a click: fetched again when it is about to expire. */
  const freshUrl = useCallback(
    async (fileId: string): Promise<string | undefined> => {
      const current = urlsRef.current[fileId]
      if (current && !needsFreshUrl(current.expires_at)) return current.url
      return (await reload())[fileId]?.url
    },
    [reload],
  )

  return { urls, freshUrl, reload }
}
