// REST fetchers for the messages feature.
// Contract: chatty-infra/docs/api-chat.md.

import { chatApi } from "@/lib/api"

import type {
  ApiMessage,
  GetEventsResponse,
  GetMessagesResponse,
  GetPinsResponse,
  PinMessageResponse,
  SendMessageResponse,
} from "../types"

export function getMessages(channelId: string, beforeSeq?: number): Promise<GetMessagesResponse> {
  const params = beforeSeq !== undefined ? `?before_seq=${beforeSeq}` : ""
  return chatApi.get<GetMessagesResponse>(`/channels/${channelId}/messages${params}`)
}

export function sendMessageApi(
  channelId: string,
  body: string,
  clientMsgId: string,
): Promise<SendMessageResponse> {
  return chatApi.post<SendMessageResponse>(`/channels/${channelId}/messages`, {
    body,
    client_msg_id: clientMsgId,
  })
}

export function editMessageApi(messageId: string, body: string): Promise<ApiMessage> {
  return chatApi.put<ApiMessage>(`/messages/${messageId}`, { body })
}

export function deleteMessageApi(messageId: string): Promise<void> {
  return chatApi.delete<void>(`/messages/${messageId}`)
}

const reactionPath = (messageId: string, emoji: string) =>
  `/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`

// The answers carry the new reactions, but counts only change from events (see apply-event):
// the event for my own reaction also arrives, and applying both would count it twice.
export function addReactionApi(messageId: string, emoji: string): Promise<unknown> {
  return chatApi.put(reactionPath(messageId, emoji))
}

export function removeReactionApi(messageId: string, emoji: string): Promise<unknown> {
  return chatApi.delete(reactionPath(messageId, emoji))
}

export function pinMessageApi(channelId: string, messageId: string): Promise<PinMessageResponse> {
  return chatApi.post<PinMessageResponse>(`/channels/${channelId}/pins/${messageId}`)
}

export function unpinMessageApi(channelId: string, messageId: string): Promise<void> {
  return chatApi.delete<void>(`/channels/${channelId}/pins/${messageId}`)
}

export function listPinsApi(channelId: string): Promise<GetPinsResponse> {
  return chatApi.get<GetPinsResponse>(`/channels/${channelId}/pins`)
}

/** GET /channels/{id}/events — fetch events after a known seq (gap-fill). */
export function getChannelEvents(channelId: string, afterSeq: number): Promise<GetEventsResponse> {
  return chatApi.get<GetEventsResponse>(`/channels/${channelId}/events?after_seq=${afterSeq}`)
}
