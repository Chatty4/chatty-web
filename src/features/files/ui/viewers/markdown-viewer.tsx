import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { useBlobText } from "../../hooks/use-blob-text"
import { TruncatedNote } from "./truncated-note"
import type { ViewerProps } from "./types"

const REMARK_PLUGINS = [remarkGfm]

// A document, not a chat bubble: headings at page sizes, with room between blocks.
const COMPONENTS: Components = {
  h1: ({ children }) => <h1 className="mt-6 mb-3 text-2xl font-semibold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-6 mb-2 border-b pb-1 text-xl font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-5 mb-2 text-lg font-semibold">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-4 mb-1 font-semibold">{children}</h4>,
  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-3 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal pl-6">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-border-strong pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded-[4px] bg-foreground/10 px-1 py-px font-mono text-[0.9em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-md bg-foreground/10 p-3 font-mono text-xs [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border bg-surface-subtle px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border px-2 py-1">{children}</td>,
  hr: () => <hr className="my-6" />,
  // A picture would load from wherever the document points: its description instead.
  img: ({ alt }) => <span className="text-muted-foreground italic">[{alt || "image"}]</span>,
}

/** A Markdown file as a formatted document. Raw HTML in it is left out. */
export function MarkdownViewer({ blob }: ViewerProps) {
  const read = useBlobText(blob)
  if (!read) return null

  return (
    <article className="mx-auto max-w-3xl px-6 py-5 text-sm break-words">
      <Markdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS} skipHtml>
        {read.text}
      </Markdown>
      {read.truncated && <TruncatedNote />}
    </article>
  )
}
