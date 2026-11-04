// Keeps a channel's pin list in step with events (chatty-infra/docs/events.md pin.added,
// pin.removed, message.deleted). Pure functions; the reducer calls them.

import type { ChannelEvent } from "@/lib/ws/types"

import type { LocalMessage, Pin, PinsState } from "../types"
import type { MessageEdit } from "./apply-event"

export type PinInfo = { message_id: string; pinned_by: string; pinned_at: string }

/** Newest pin first. Replaces an existing entry, so the REST answer and event can both apply. */
function upsertPin(items: Pin[], pin: Pin): Pin[] {
  const others = items.filter((item) => item.message.id !== pin.message.id)
  return [...others, pin].sort((a, b) => Date.parse(b.pinned_at) - Date.parse(a.pinned_at))
}

export function addPin(
  pins: PinsState | undefined,
  info: PinInfo,
  messages: LocalMessage[],
): PinsState | undefined {
  if (!pins) return pins
  const message = messages.find((m) => m.id === info.message_id)
  if (message?.deleted_at) return pins
  // The list holds a copy of the message, and this one isn't loaded: only the server has it.
  if (!message) return { ...pins, stale: true }
  return {
    ...pins,
    items: upsertPin(pins.items, {
      pinned_by: info.pinned_by,
      pinned_at: info.pinned_at,
      message,
    }),
  }
}

export function removePin(pins: PinsState | undefined, messageId: string): PinsState | undefined {
  if (!pins) return pins
  return { ...pins, items: pins.items.filter((item) => item.message.id !== messageId) }
}

export function editPin(pins: PinsState | undefined, edit: MessageEdit): PinsState | undefined {
  if (!pins) return pins
  return {
    ...pins,
    items: pins.items.map((item) =>
      item.message.id === edit.message_id
        ? {
            ...item,
            message: {
              ...item.message,
              body: edit.body,
              mentions: edit.mentions,
              edited_at: edit.edited_at,
            },
          }
        : item,
    ),
  }
}

function changePins(pins: PinsState | undefined, event: ChannelEvent, messages: LocalMessage[]) {
  switch (event.type) {
    case "pin.added":
      return addPin(pins, event.payload as PinInfo, messages)
    case "pin.removed":
      return removePin(pins, (event.payload as { message_id: string }).message_id)
    case "message.deleted":
      // A deleted message loses its pin without a separate pin.removed.
      return removePin(pins, (event.payload as { message_id: string }).message_id)
    case "message.edited":
      return editPin(pins, event.payload as MessageEdit)
    default:
      return pins
  }
}

/** `messages` is the channel's list with the event already applied. */
export function applyEventToPins(
  pins: PinsState | undefined,
  event: ChannelEvent,
  messages: LocalMessage[],
): PinsState | undefined {
  const next = changePins(pins, event, messages)
  // The answer in flight may be from before this event, so the result can't be trusted.
  if (next && next !== pins && next.status === "loading") return { ...next, stale: true }
  return next
}
