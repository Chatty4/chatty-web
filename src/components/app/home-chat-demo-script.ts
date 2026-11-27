// The Home sidebar's sample conversation and its loop, apart from the component so it can be tested.

// Sample people, not real users. `typing` shows the dots in the message's place first.
export const MESSAGES = [
  { name: "Ana Pop", text: "Morning! Is the new build up on staging?" },
  { name: "Mihai Ionescu", text: "Yep, deployed ten minutes ago 🚀", typing: true },
  { name: "Ioana Radu", text: "Checked the login flow, looks good to me.", typing: true },
  { name: "Ana Pop", text: "Perfect. Any blockers before we ship?" },
  { name: "Mihai Ionescu", text: "Just the release notes, writing them now ✍️", typing: true },
  { name: "Darius Stan", text: "I can review them after standup" },
  { name: "Ioana Radu", text: "Found a tiny typo on the settings page, fixing it" },
  { name: "Mihai Ionescu", text: "Notes are up, take a look 👀", typing: true },
  { name: "Darius Stan", text: "Reviewed, all good 👍", typing: true },
  { name: "Ana Pop", text: "Great work everyone. Shipping after lunch 🍕", typing: true },
  { name: "Ioana Radu", text: "🎉" },
]

const TYPING_MS = 1400
const MESSAGE_MS = 1300
const HOLD_MS = 2500
const LEAVE_MS = 900

export type DemoState = { shown: number; typing: boolean; phase: "play" | "leave" | "reset" }
export const START: DemoState = { shown: 0, typing: false, phase: "reset" }

/** The state after `state`, and how long to wait before switching to it. */
export function next(state: DemoState): [DemoState, number] {
  if (state.phase === "reset") return [{ shown: 0, typing: false, phase: "play" }, 400]
  if (state.phase === "leave") return [START, LEAVE_MS]
  if (state.shown === MESSAGES.length) return [{ ...state, phase: "leave" }, HOLD_MS]
  if (MESSAGES[state.shown].typing && !state.typing) return [{ ...state, typing: true }, TYPING_MS]
  return [{ shown: state.shown + 1, typing: false, phase: "play" }, MESSAGE_MS]
}
