// The markdown subset for chat messages. Anything left out stays as the text the user typed.

import { defaultUrlTransform } from "react-markdown"

import { splitMentions } from "./mentions"

/** Parser features switched off: what they match stays as the text the user typed. */
const DISABLED_CONSTRUCTS = [
  "setextUnderline",
  "thematicBreak",
  "codeIndented",
  "labelStartImage",
  "definition",
  "htmlFlow",
  "htmlText",
  "table",
  "gfmFootnoteCall",
  "gfmFootnoteDefinition",
  "gfmPotentialFootnoteCall",
  "tasklistCheck",
]

/** A second line of defence: nothing outside this list reaches the page. */
export const ALLOWED_ELEMENTS = [
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "del",
  "a",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "span",
]

/**
 * Spacing between blocks, and "(edited)" can sit beside the last paragraph.
 * overflow-wrap: anywhere keeps long links and inline code inside the bubble.
 */
export const MARKDOWN_BLOCK_CLASS =
  "[overflow-wrap:anywhere] [&>*+*]:mt-1.5 [&>p:last-of-type]:inline-block [&>p:last-of-type]:max-w-full"

/** remark plugin that restricts the parser to the subset above. */
export function remarkChatSubset(this: { data: () => object }) {
  const data = this.data() as { micromarkExtensions?: unknown[] }
  data.micromarkExtensions = [
    ...(data.micromarkExtensions ?? []),
    { disable: { null: DISABLED_CONSTRUCTS } },
  ]
}

type TreeNode = { type: string; value?: string; children?: TreeNode[]; data?: unknown }

function mentionNode(userId: string): TreeNode {
  return {
    type: "mention",
    data: { hName: "span", hProperties: { dataMentionId: userId } },
  }
}

function replaceMentions(node: TreeNode) {
  if (!node.children) return
  node.children = node.children.flatMap((child) => {
    if (child.type !== "text" || !child.value?.includes("<@")) {
      replaceMentions(child)
      return [child]
    }
    return splitMentions(child.value).map((part) =>
      part.type === "mention" ? mentionNode(part.userId) : { type: "text", value: part.value },
    )
  })
}

/**
 * remark plugin that turns `<@id>` in text into a mention node. It makes a node type
 * markdown has no syntax for, so nobody can fake a mention by typing a link.
 */
export function remarkMentions() {
  return replaceMentions
}

/** Only web and mail links: anything else, such as javascript:, becomes plain text. */
export function safeUrl(url: string): string {
  const safe = defaultUrlTransform(url)
  return /^(https?:|mailto:)/i.test(safe) ? safe : ""
}
