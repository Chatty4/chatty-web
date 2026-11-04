import { memo, useMemo } from "react"
import Markdown, { type Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

import { ALLOWED_ELEMENTS, remarkChatSubset, remarkMentions, safeUrl } from "../utils/markdown"
import { decodeMentions } from "../utils/mentions"

const REMARK_PLUGINS = [remarkGfm, remarkBreaks, remarkChatSubset, remarkMentions]

type MessageMarkdownProps = {
  body: string
  /** True inside my own light-blue bubble, where the mention chip wouldn't show. */
  own: boolean
  names: Record<string, string>
}

function buildComponents({ own, names }: Omit<MessageMarkdownProps, "body">): Components {
  return {
    span: ({ node }) => {
      const userId = String(node?.properties.dataMentionId ?? "")
      return (
        <span
          className={cn(
            "font-medium text-primary",
            own ? "font-semibold" : "rounded-[4px] bg-accent px-1 py-px",
          )}
        >
          @{names[userId] ?? "unknown user"}
        </span>
      )
    },
    a: ({ href, children }) =>
      href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-primary underline underline-offset-2"
        >
          {children}
        </a>
      ) : (
        <>{children}</>
      ),
    code: ({ children }) => (
      <code className="rounded-[4px] bg-foreground/10 px-1 py-px font-mono text-[0.9em]">
        {typeof children === "string" ? decodeMentions(children, names) : children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="overflow-x-auto rounded-sm bg-foreground/10 px-2.5 py-2 font-mono text-[0.9em] [&>code]:bg-transparent [&>code]:p-0">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-border-strong pl-2.5 text-muted-foreground">
        {children}
      </blockquote>
    ),
    ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
  }
}

/** A stored message body as formatted text, with `<@id>` shown as `@Display Name`. */
export const MessageMarkdown = memo(function MessageMarkdown({
  body,
  own,
  names,
}: MessageMarkdownProps) {
  const components = useMemo(() => buildComponents({ own, names }), [own, names])

  return (
    <Markdown
      remarkPlugins={REMARK_PLUGINS}
      allowedElements={ALLOWED_ELEMENTS}
      unwrapDisallowed
      urlTransform={safeUrl}
      components={components}
    >
      {body}
    </Markdown>
  )
})
