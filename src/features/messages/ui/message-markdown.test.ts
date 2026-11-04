import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { MessageMarkdown } from "./message-markdown"

const ID = "09a8895a-1267-47f3-9acc-8e32419c8bad"
const names = { [ID]: "Ana Pop" }

const render = (body: string, own = false) =>
  renderToStaticMarkup(createElement(MessageMarkdown, { body, own, names }))

const text = (html: string) => html.replace(/<[^>]+>/g, "")

describe("formatting", () => {
  it.each([
    ["**bold**", "<strong>bold</strong>"],
    ["*italic*", "<em>italic</em>"],
    ["~~gone~~", "<del>gone</del>"],
  ])("renders %s", (body, expected) => {
    expect(render(body)).toContain(expected)
  })

  it("renders inline code and code blocks", () => {
    expect(render("run `npm test`")).toMatch(/<code[^>]*>npm test<\/code>/)
    expect(render("```\nconst a = 1\n```")).toMatch(/<pre[^>]*><code[^>]*>const a = 1/)
  })

  it("renders lists and quotes", () => {
    expect(render("- one\n- two")).toMatch(/<ul[^>]*>[\s\S]*<li>one<\/li>/)
    expect(render("1. one")).toMatch(/<ol[^>]*>/)
    expect(render("> quoted")).toMatch(/<blockquote[^>]*>/)
  })

  it("keeps a single line break", () => {
    expect(render("first\nsecond")).toContain("<br/>")
  })
})

describe("left as typed", () => {
  it.each([
    ["# not a heading", "# not a heading"],
    ["title\n---", "---"],
    ["---", "---"],
    ["![cat](https://x.test/cat.png)", "!"],
    ["| a | b |\n|---|---|\n| 1 | 2 |", "| a | b |"],
    ["[a]: https://x.test", "[a]: https://x.test"],
    ["word[^1]", "[^1]"],
  ])("%j", (body, kept) => {
    const html = render(body)
    expect(text(html).replaceAll("&#x27;", "'")).toContain(kept)
    expect(html).not.toMatch(/<(h\d|hr|img|table|input)\b/)
  })

  it("keeps a checkbox line as a list item with its text", () => {
    const html = render("- [ ] task")
    expect(html).not.toContain("<input")
    expect(text(html)).toContain("[ ] task")
  })

  it("keeps four leading spaces as text, not a code block", () => {
    expect(render("    indented")).not.toContain("<pre")
  })
})

describe("safety", () => {
  it("shows raw HTML as text instead of running it", () => {
    const html = render('<img src=x onerror="alert(1)"><script>alert(2)</script>')
    expect(html).not.toMatch(/<(img|script)\b/)
    expect(html).toContain("&lt;script&gt;")
  })

  it.each([
    "[x](javascript:alert(1))",
    "[x](JaVaScRiPt:alert(1))",
    "[x](data:text/html;base64,PHNjcmlwdD4=)",
    "[x](vbscript:alert(1))",
    "[x](/relative/path)",
    "<javascript:alert(1)>",
  ])("doesn't link %s", (body) => {
    expect(render(body)).not.toContain("<a")
  })

  it("opens links safely in a new tab", () => {
    const html = render("[site](https://example.test)")
    expect(html).toContain('href="https://example.test"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer nofollow"')
  })

  it("links a bare web address", () => {
    expect(render("see https://example.test now")).toContain('href="https://example.test"')
  })
})

describe("mentions", () => {
  it("shows the display name", () => {
    expect(text(render(`hey <@${ID}> there`))).toBe("hey @Ana Pop there")
  })

  it("works inside formatting", () => {
    expect(render(`**<@${ID}>**`)).toMatch(/<strong><span[^>]*>@Ana Pop<\/span><\/strong>/)
  })

  it("falls back for an unknown user", () => {
    const unknown = "11111111-1111-4111-8111-111111111111"
    expect(text(render(`<@${unknown}>`))).toBe("@unknown user")
  })

  it("shows the name inside code too", () => {
    expect(text(render(`\`<@${ID}>\``))).toBe("@Ana Pop")
  })

  it("can't be faked with a link", () => {
    const html = render(`[@Ana Pop](mention:${ID})`)
    expect(html).not.toContain("bg-accent")
    expect(html).not.toContain("<a")
  })
})
