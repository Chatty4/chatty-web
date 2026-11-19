import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { useAuth } from "@/features/auth"
import { useActiveTeamId } from "@/features/teams/hooks/use-active-team-id"
import { useWs } from "@/features/ws"

import {
  getLastMessageAtRequest,
  getSidebarChannelsRequest,
  getTeamMemberPreviewsRequest,
  updateMyChannelSettingsRequest,
} from "../fetchers/channel-fetchers"
import { ChannelsContext } from "../hooks/channels-context"
import type { SidebarChannel } from "../types"
import { applyChannelUpdate } from "../utils/apply-channel-update"
import { laterTime, sortDmsByActivity } from "../utils/dm-order"
import { createUnknownChannelTracker } from "../utils/unknown-channels"

/** Several messages for a new channel arrive together; one reload is enough. */
const RELOAD_DEBOUNCE_MS = 500

type ChannelsState =
  | { status: "loading" }
  | {
      status: "loaded"
      forTeamId: string
      channels: SidebarChannel[]
      dms: SidebarChannel[]
      /** DMs I hid: out of the sidebar until one gets an unread message (D-04). */
      hiddenDms: SidebarChannel[]
      /** channelId -> when its newest message was sent, to order the DMs. */
      lastMessageAt: Record<string, string>
      memberNames: Record<string, string>
      /** Every channel I'm in, hidden DMs included: a message for one of these needs no reload. */
      knownIds: ReadonlySet<string>
    }
  | { status: "error"; forTeamId: string }

async function fetchChannels(teamId: string, myUserId: string): Promise<ChannelsState> {
  try {
    const { channels: all } = await getSidebarChannelsRequest(teamId)

    const channels = all.filter((c) => c.kind !== "dm" && !c.my.hidden)
    const dms = all.filter((c) => c.kind === "dm" && !c.my.hidden)
    const hiddenDms = all.filter((c) => c.kind === "dm" && c.my.hidden)

    // Batch-resolve DM participant display names (excluding self), hidden DMs too: one can come back.
    const dmUserIds = [
      ...new Set(
        [...dms, ...hiddenDms].flatMap((dm) => (dm.dm_member_ids ?? []).filter((id) => id !== myUserId)),
      ),
    ]

    const memberNames: Record<string, string> = {}
    if (dmUserIds.length > 0) {
      const { members } = await getTeamMemberPreviewsRequest(teamId, dmUserIds)
      for (const m of members) memberNames[m.user_id] = m.display_name
    }

    const knownIds = new Set(all.map((c) => c.id))
    return {
      status: "loaded",
      forTeamId: teamId,
      channels,
      dms,
      hiddenDms,
      lastMessageAt: {},
      memberNames,
      knownIds,
    }
  } catch {
    return { status: "error", forTeamId: teamId }
  }
}

/** Fetches the channel/DM sidebar list for the active team and provides it to all children. */
export function ChannelsProvider({ children }: { children: ReactNode }) {
  const teamId = useActiveTeamId()
  const { user } = useAuth()
  const { subscribe, onReconnect } = useWs()
  const myUserId = user?.id ?? ""

  const [state, setState] = useState<ChannelsState>({ status: "loading" })
  const generation = useRef(0)

  const load = useCallback((tid: string, uid: string) => {
    const current = ++generation.current
    void fetchChannels(tid, uid).then((next) => {
      if (current !== generation.current) return
      setState(next)
      if (next.status !== "loaded") return
      // After the sidebar shows: the DMs reorder once their last messages are known.
      // shortcut: one request per DM; ask chatty-chat for a batch endpoint if teams get many DMs.
      // Hidden DMs too: one can come back, and then needs its place.
      const dms = [...next.dms, ...next.hiddenDms]
      void Promise.allSettled(dms.map((dm) => getLastMessageAtRequest(dm.id))).then((results) => {
        if (current !== generation.current) return
        const times: Record<string, string> = {}
        results.forEach((result, i) => {
          if (result.status === "fulfilled" && result.value) times[dms[i]!.id] = result.value
        })
        setState((prev) =>
          prev.status === "loaded"
            ? { ...prev, lastMessageAt: { ...times, ...prev.lastMessageAt } }
            : prev,
        )
      })
    })
  }, [])

  useEffect(() => {
    if (!teamId) {
      generation.current++
      return
    }
    load(teamId, myUserId)
  }, [teamId, myUserId, load])

  const reload = useCallback(() => {
    if (teamId) load(teamId, myUserId)
  }, [teamId, myUserId, load])

  // ── Channels others add me to ──────────────────────────────────────────────────
  // No message says I was added to a channel, removed from one or sent a new DM. A reconnect
  // may have missed any of that, and a message for a channel the sidebar doesn't list means
  // I'm in it now.
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  const reloadRef = useRef(reload)
  useEffect(() => { reloadRef.current = reload }, [reload])
  const [tracker] = useState(createUnknownChannelTracker)
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    tracker.reset() // ids checked for another team say nothing about this one
  }, [teamId, tracker])

  useEffect(() => () => clearTimeout(reloadTimer.current), [])

  useEffect(
    () =>
      onReconnect(() => {
        tracker.reset()
        reloadRef.current()
      }),
    [onReconnect, tracker],
  )

  useEffect(
    () =>
      subscribe((message) => {
        const channelId =
          message.type === "event" ? message.event.channel_id
          : message.type === "unread" ? message.channel_id
          : null
        const current = stateRef.current
        // Until the sidebar has loaded, the load in progress lists the channel anyway.
        if (channelId === null || current.status !== "loaded") return
        if (!tracker.shouldReload(channelId, current.knownIds)) return
        clearTimeout(reloadTimer.current)
        reloadTimer.current = setTimeout(() => reloadRef.current(), RELOAD_DEBOUNCE_MS)
      }),
    [subscribe, tracker],
  )

  // Renames and archives by other people: the sidebar and composer follow without a reload.
  useEffect(
    () =>
      subscribe((message) => {
        if (message.type !== "channel.updated") return
        setState((current) =>
          current.status === "loaded"
            ? { ...current, channels: applyChannelUpdate(current.channels, message) }
            : current,
        )
      }),
    [subscribe],
  )

  // ── Hidden DMs ─────────────────────────────────────────────────────────────────
  const setHidden = useCallback((channelId: string, hidden: boolean) => {
    setState((current) => {
      if (current.status !== "loaded") return current
      const all = [...current.dms, ...current.hiddenDms]
      const dm = all.find((d) => d.id === channelId)
      if (!dm) return current
      const moved = { ...dm, my: { ...dm.my, hidden } }
      const others = (list: SidebarChannel[]) => list.filter((d) => d.id !== channelId)
      return hidden
        ? { ...current, dms: others(current.dms), hiddenDms: [...others(current.hiddenDms), moved] }
        : { ...current, dms: [...others(current.dms), moved], hiddenDms: others(current.hiddenDms) }
    })
  }, [])

  /** Takes a DM out of my sidebar (PUT /channels/{id}/me, hidden). Rejects with ApiError. */
  const hideDm = useCallback(
    async (channelId: string) => {
      const current = stateRef.current
      const dm = current.status === "loaded" ? current.dms.find((d) => d.id === channelId) : undefined
      if (!dm) return
      await updateMyChannelSettingsRequest(channelId, { ...dm.my, hidden: true })
      setHidden(channelId, true)
    },
    [setHidden],
  )

  useEffect(
    () =>
      subscribe((message) => {
        // A new message moves its DM to the top, mine too.
        if (message.type === "event" && message.event.type === "message.created") {
          const { channel_id: channelId, created_at: createdAt } = message.event
          setState((current) =>
            current.status === "loaded" && current.knownIds.has(channelId)
              ? {
                  ...current,
                  lastMessageAt: {
                    ...current.lastMessageAt,
                    [channelId]: laterTime(current.lastMessageAt[channelId], createdAt),
                  },
                }
              : current,
          )
        }
      }),
    [subscribe],
  )

  /**
   * D-04: brings a hidden DM back, here and on my other devices. Called when it has unread
   * messages (the sidebar knows the counts).
   */
  const showDm = useCallback(
    (channelId: string) => {
      const current = stateRef.current
      const dm =
        current.status === "loaded" ? current.hiddenDms.find((d) => d.id === channelId) : undefined
      if (!dm) return
      setHidden(dm.id, false)
      // Shown here either way; a failure only means my other devices still hide it.
      void updateMyChannelSettingsRequest(dm.id, { ...dm.my, hidden: false }).catch(() => {})
    },
    [setHidden],
  )

  const value = useMemo(() => {
    const loaded = state.status === "loaded" && state.forTeamId === teamId
    const failed = state.status === "error" && state.forTeamId === teamId
    return {
      channels: loaded ? state.channels : [],
      dms: loaded ? sortDmsByActivity(state.dms, state.lastMessageAt) : [],
      memberNames: loaded ? state.memberNames : {},
      loading: !!teamId && !loaded && !failed,
      failed,
      hiddenDms: loaded ? state.hiddenDms : [],
      reload,
      hideDm,
      showDm,
    }
  }, [state, teamId, reload, hideDm, showDm])

  return <ChannelsContext.Provider value={value}>{children}</ChannelsContext.Provider>
}
