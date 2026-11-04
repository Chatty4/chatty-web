import { describe, expect, it } from "vitest"

import type { TeamListItem } from "../types"
import { pickHomeTeam } from "./last-team"

const team = (id: string): TeamListItem => ({
  id,
  name: id,
  icon_file_id: null,
  role: "member",
  member_count: 1,
  created_at: "2026-11-04T10:00:00Z",
})

describe("pickHomeTeam", () => {
  it("prefers the team used last", () => {
    expect(pickHomeTeam([team("a"), team("b")], "b")?.id).toBe("b")
  })

  it("falls back to the first team when that one is gone or unknown", () => {
    expect(pickHomeTeam([team("a"), team("b")], "left")?.id).toBe("a")
    expect(pickHomeTeam([team("a")], null)?.id).toBe("a")
  })

  it("is undefined without teams", () => {
    expect(pickHomeTeam([], "a")).toBeUndefined()
  })
})
