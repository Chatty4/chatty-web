// REST fetchers for the messages feature.
// Contract: chatty-infra/docs/api-chat.md.

import { chatApi } from "@/lib/api"

import type {
  ApiMessage,
  GetEventsResponse,
  GetMessagesResponse,
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

/** GET /channels/{id}/events — fetch events after a known seq (gap-fill). */
export function getChannelEvents(channelId: string, afterSeq: number): Promise<GetEventsResponse> {
  return chatApi.get<GetEventsResponse>(`/channels/${channelId}/events?after_seq=${afterSeq}`)
}
