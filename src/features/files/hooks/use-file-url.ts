import { useEffect, useRef, useState } from "react"

export type FileUrlState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "failed" }

/**
 * A download URL that works now, for a player that streams the file instead of downloading it
 * whole. `getUrl` gives it (presigned URLs expire); a new `key` asks again.
 */
export function useFileUrl(key: string, getUrl: () => Promise<string | undefined>): FileUrlState {
  const [state, setState] = useState<{ key: string; value: FileUrlState }>()
  // The caller may pass a new function on every render; only `key` asks again.
  const getUrlRef = useRef(getUrl)
  useEffect(() => {
    getUrlRef.current = getUrl
  })

  useEffect(() => {
    let current = true
    const done = (value: FileUrlState) => {
      if (current) setState({ key, value })
    }
    getUrlRef
      .current()
      .then((url) => done(url ? { status: "ready", url } : { status: "failed" }))
      .catch(() => done({ status: "failed" }))
    return () => {
      current = false
    }
  }, [key])

  return state?.key === key ? state.value : { status: "loading" }
}
