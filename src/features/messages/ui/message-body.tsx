import { GifEmbed, isGifMessage } from "@/features/gifs"

import { isSingleEmoji } from "../utils/emoji"
import { MessageMarkdown } from "./message-markdown"

type MessageBodyProps = {
  body: string
  /** Mention chips styled for a light-blue bubble (mine, or one for me). */
  own: boolean
  /** userId → display name, for `<@id>` mentions. */
  names: Record<string, string>
}

/** The text of a message as it shows: a GIF, one big emoji, or formatted text. */
export function MessageBody({ body, own, names }: MessageBodyProps) {
  if (!body) return null
  if (isGifMessage(body)) return <GifEmbed url={body} />
  if (isSingleEmoji(body)) return <span className="block text-4xl leading-tight">{body.trim()}</span>
  return <MessageMarkdown body={body} own={own} names={names} />
}
