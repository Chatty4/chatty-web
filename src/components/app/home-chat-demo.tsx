import { Avatar } from "@/components/ui/avatar"
import { TypingDots } from "@/features/typing/ui/typing-dots"

// Sample people, not real users. Delays fit the 14s loop in index.css: the last message
// fades out before the first comes back.
const MESSAGES = [
  { name: "Ana Pop", text: "Morning! Is the new build up on staging?", delay: "0s" },
  { name: "Mihai Ionescu", text: "Yep, deployed ten minutes ago 🚀", delay: "1.2s" },
  { name: "Ioana Radu", text: "Checked the login flow, looks good to me.", delay: "3s" },
  { name: "Ana Pop", text: "Perfect, let's ship it after lunch 🍕", delay: "4.2s" },
]

/**
 * A looping sample conversation for the Home sidebar. Decorative, so screen readers skip it.
 * Only opacity and transform animate (no layout or paint), and it is display:none on small
 * screens, where it would sit in the closed drawer. With reduced motion it shows still.
 */
export function HomeChatDemo() {
  return (
    <div aria-hidden="true" className="hidden flex-col gap-4 px-5 pt-5 select-none md:flex">
      {MESSAGES.map((message) => (
        <div
          key={message.delay}
          className="flex animate-demo-message gap-2.5 motion-reduce:animate-none"
          style={{ animationDelay: message.delay }}
        >
          <Avatar name={message.name} className="size-7 text-[10px]" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">{message.name}</p>
            <p className="text-[13px] text-muted-foreground">{message.text}</p>
          </div>
        </div>
      ))}
      <div
        className="flex animate-demo-typing items-center gap-2 text-[12px] text-faint-foreground motion-reduce:hidden"
        style={{ animationDelay: "1.7s" }}
      >
        <TypingDots />
        Ioana is typing
      </div>
    </div>
  )
}
