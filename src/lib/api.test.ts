import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/session", () => ({
  getAccessToken: () => "old",
  hasStoredSession: () => true,
  refreshSession: vi.fn(async () => "new"),
}))

import { ApiError, request, requestBlob } from "./api"
import { refreshSession } from "./session"

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockReset()
  vi.mocked(refreshSession).mockClear()
})

afterEach(() => vi.unstubAllGlobals())

const tokenOf = (call: number) =>
  (fetchMock.mock.calls[call]?.[1]?.headers as Record<string, string>).Authorization

describe("request", () => {
  it("refreshes an expired token once and repeats the request", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: "unauthorized", message: "x" } }))
      .mockResolvedValueOnce(json(200, { ok: true }))
    await expect(request("/x")).resolves.toEqual({ ok: true })
    expect(tokenOf(1)).toBe("Bearer new")
  })

  it("doesn't refresh on another 401 code", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: { code: "invalid_credentials", message: "x" } }))
    await expect(request("/x")).rejects.toMatchObject({ code: "invalid_credentials" })
    expect(refreshSession).not.toHaveBeenCalled()
  })
})

describe("requestBlob", () => {
  it("returns the file, after a refresh too", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: "unauthorized", message: "x" } }))
      .mockResolvedValueOnce(new Response("PNG", { status: 200 }))
    expect(await (await requestBlob("/files/f1")).text()).toBe("PNG")
  })

  it("turns an error answer into an ApiError", async () => {
    fetchMock.mockResolvedValueOnce(json(404, { error: { code: "file_not_found", message: "x" } }))
    await expect(requestBlob("/files/f1")).rejects.toBeInstanceOf(ApiError)
  })
})
