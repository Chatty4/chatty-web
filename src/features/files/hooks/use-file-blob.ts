import { useEffect, useRef, useState } from "react"

export type FileBlobState =
  | { status: "loading" }
  | { status: "loaded"; blob: Blob }
  | { status: "failed" }

/**
 * A file's bytes, for a preview. `getUrl` gives a download URL that works now (presigned URLs
 * expire); a new `key` loads again. Plain fetch, with no cookies or token: the URL is the key.
 */
export function useFileBlob(key: string, getUrl: () => Promise<string | undefined>): FileBlobState {
  const [state, setState] = useState<{ key: string; value: FileBlobState }>()
  // The caller may pass a new function on every render; only `key` starts a new load.
  const getUrlRef = useRef(getUrl)
  useEffect(() => {
    getUrlRef.current = getUrl
  })

  useEffect(() => {
    const controller = new AbortController()
    const done = (value: FileBlobState) => {
      if (!controller.signal.aborted) setState({ key, value })
    }
    getUrlRef
      .current()
      .then(async (url) => {
        if (!url) return done({ status: "failed" })
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) return done({ status: "failed" })
        done({ status: "loaded", blob: await response.blob() })
      })
      .catch(() => done({ status: "failed" }))
    return () => controller.abort()
  }, [key])

  return state?.key === key ? state.value : { status: "loading" }
}
