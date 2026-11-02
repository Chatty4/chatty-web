import { Link } from "react-router"

import { BrandMark } from "./brand-mark"

/** The narrow column on the left. Team tiles come with CHAT-193. */
export function TeamRail() {
  return (
    <aside
      aria-label="Teams"
      className="z-20 hidden w-16 shrink-0 flex-col items-center gap-2 border-r bg-background px-2.5 py-3 md:flex"
    >
      <Link
        to="/"
        aria-label="Chatty home"
        className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BrandMark className="size-[34px] rounded-sm" />
      </Link>
      <div className="my-0.5 h-px w-7 bg-border" />
    </aside>
  )
}
