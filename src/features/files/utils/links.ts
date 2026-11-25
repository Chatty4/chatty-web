const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"])

/** Whether a link from a file may be followed: web and mail links only, never javascript: or file:. */
export function isSafeHref(href: string): boolean {
  try {
    return SAFE_PROTOCOLS.has(new URL(href).protocol)
  } catch {
    return false
  }
}

/** Makes the links rendered from a file open in a new tab, and turns unsafe ones into plain text. */
export function secureLinks(root: HTMLElement) {
  for (const link of root.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href") ?? ""
    // Links inside the document (#bookmark) keep working.
    if (href.startsWith("#")) continue
    if (isSafeHref(href)) {
      link.setAttribute("target", "_blank")
      link.setAttribute("rel", "noopener noreferrer nofollow")
    } else {
      link.removeAttribute("href")
    }
  }
}
