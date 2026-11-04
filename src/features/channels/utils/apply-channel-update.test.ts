import { describe, expect, it } from "vitest"

import type { SidebarChannel } from "../types"
import { applyChannelUpdate } from "./apply-channel-update"

const channel = (id: string): SidebarChannel => ({
  id,
  kind: "public",
  name: "old",
  topic: null,
  is_default: false,
  archived: false,
  dm_member_ids: null,
  my: { notify_level: "all", muted: false, hidden: false, role: "member" } as SidebarChannel["my"],
})

describe("applyChannelUpdate", () => {
  it("updates only the named channel", () => {
    const [first, second] = applyChannelUpdate([channel("a"), channel("b")], {
      type: "channel.updated",
      channel_id: "a",
      name: "new",
      topic: "t",
      archived: true,
    })
    expect(first).toMatchObject({ name: "new", topic: "t", archived: true })
    expect(second).toMatchObject({ name: "old", archived: false })
  })
})
