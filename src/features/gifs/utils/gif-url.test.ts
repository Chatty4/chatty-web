import { describe, expect, it } from "vitest"

import { isGifMessage } from "./gif-url"

describe("isGifMessage", () => {
  it.each([
    "https://media.giphy.com/media/abc/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lk/abc/giphy.gif?cid=1&rid=giphy.gif",
    "https://i.giphy.com/abc.gif",
  ])("shows %s as a GIF", (body) => {
    expect(isGifMessage(body)).toBe(true)
  })

  it.each([
    "http://media.giphy.com/media/abc/giphy.gif", // not https
    "https://evil.com/media.giphy.com/abc.gif",
    "https://media.giphy.com.evil.com/abc.gif",
    "https://giphy.com/gifs/abc", // the web page, not the image
    "look https://media.giphy.com/media/abc/giphy.gif", // text around it
    "hello",
  ])("leaves %s as text", (body) => {
    expect(isGifMessage(body)).toBe(false)
  })
})
