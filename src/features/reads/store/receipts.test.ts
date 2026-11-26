import { describe, expect, it } from "vitest"

import {
  hasReadReceipts,
  receiptFor,
  receiptLabel,
  seenBy,
  showsReceipt,
  type ReceiptMessage,
} from "./receipts"

const mine: ReceiptMessage = { author_id: "me", seq: 10, status: "sent", deleted_at: null }

describe("showsReceipt", () => {
  it("shows ticks on my sent messages in private channels and DMs", () => {
    expect(showsReceipt(mine, "me", "private")).toBe(true)
    expect(showsReceipt(mine, "me", "dm")).toBe(true)
  })

  it("shows none in public channels or before the channel is known", () => {
    expect(showsReceipt(mine, "me", "public")).toBe(false)
    expect(showsReceipt(mine, "me", undefined)).toBe(false)
    expect(hasReadReceipts("public")).toBe(false)
  })

  it("shows none on other people's messages", () => {
    expect(showsReceipt({ ...mine, author_id: "ana" }, "me", "dm")).toBe(false)
    expect(showsReceipt(mine, undefined, "dm")).toBe(false)
  })

  it("shows none on pending, failed or deleted messages", () => {
    expect(showsReceipt({ ...mine, status: "pending" }, "me", "dm")).toBe(false)
    expect(showsReceipt({ ...mine, status: "failed" }, "me", "dm")).toBe(false)
    expect(showsReceipt({ ...mine, deleted_at: "2026-11-26T10:00:00Z" }, "me", "dm")).toBe(false)
  })
})

describe("seenBy", () => {
  it("splits the other members at the message's seq and leaves out the author", () => {
    expect(seenBy({ me: 10, ana: 10, bob: 9, cy: 12 }, mine)).toEqual({
      seen: ["ana", "cy"],
      notSeen: ["bob"],
    })
  })

  it("counts a member without a position as not having seen it", () => {
    expect(seenBy({ me: 10, ana: 0 }, mine)).toEqual({ seen: [], notSeen: ["ana"] })
  })
})

describe("receiptFor", () => {
  it("is sent when nobody else has seen it", () => {
    const receipt = receiptFor({ me: 10, ana: 9, bob: 0 }, mine)
    expect(receipt).toEqual({ status: "sent", seen: 0, total: 2 })
  })

  it("is some when part of the others have seen it", () => {
    const receipt = receiptFor({ me: 10, ana: 10, bob: 3 }, mine)
    expect(receipt).toEqual({ status: "some", seen: 1, total: 2 })
  })

  it("is all when every other member has seen it", () => {
    const receipt = receiptFor({ me: 10, ana: 11, bob: 10 }, mine)
    expect(receipt).toEqual({ status: "all", seen: 2, total: 2 })
  })

  it("gives the same object for the same counts, so rows keep their memo", () => {
    expect(receiptFor({ me: 10, ana: 10 }, mine)).toBe(receiptFor({ me: 12, bob: 11 }, mine))
  })

  it("stays sent when I am alone in the channel", () => {
    expect(receiptFor({ me: 10 }, mine)).toEqual({ status: "sent", seen: 0, total: 0 })
  })
})

describe("receiptLabel", () => {
  it("says what the ticks mean", () => {
    expect(receiptLabel({ status: "sent", seen: 0, total: 3 })).toBe("Sent")
    expect(receiptLabel({ status: "some", seen: 2, total: 5 })).toBe("Seen by 2 of 5")
    expect(receiptLabel({ status: "all", seen: 4, total: 4 })).toBe("Seen by everyone")
    expect(receiptLabel({ status: "all", seen: 1, total: 1 })).toBe("Seen")
  })
})
