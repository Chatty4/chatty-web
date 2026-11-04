import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useMatches } from "react-router"

import { useAuth } from "@/features/auth"
import { useWs } from "@/features/ws"

import { getSidebarChannelsRequest, getTeamMemberPreviewsRequest } from "../fetchers/channel-fetchers"
import { ChannelsContext } from "../hooks/channels-context"
import type { SidebarChannel } from "../types"
import { applyChannelUpdate } from "../utils/apply-channel-update"

type ChannelsState =
  | { status: "loading" }
  | {
      status: "loaded"
      forTeamId: string
      channels: SidebarChannel[]
      dms: SidebarChannel[]
      memberNames: Record<string, string>
    }
  | { status: "error"; forTeamId: string }

function getActiveTeamId(matches: ReturnType<typeof useMatches>): string {
  for (let i = matches.length - 1; i >= 0; i--) {
    const id = (matches[i].params as { teamId?: string }).teamId
    if (id) return id
  }
  return ""
}

async function fetchChannels(teamId: string, myUserId: string): Promise<ChannelsState> {
  try {
    const { channels: all } = await getSidebarChannelsRequest(teamId)

    const channels = all.filter((c) => c.kind !== "dm" && !c.my.hidden)
    const dms = all.filter((c) => c.kind === "dm" && !c.my.hidden)

    // Batch-resolve DM participant display names (excluding self)
    const dmUserIds = [
      ...new Set(
        dms.flatMap((dm) => (dm.dm_member_ids ?? []).filter((id) => id !== myUserId)),
      ),
    ]

    const memberNames: Record<string, string> = {}
    if (dmUserIds.length > 0) {
      const { members } = await getTeamMemberPreviewsRequest(teamId, dmUserIds)
      for (const m of members) memberNames[m.user_id] = m.display_name
    }

    return { status: "loaded", forTeamId: teamId, channels, dms, memberNames }
  } catch {
    return { status: "error", forTeamId: teamId }
  }
}

/** Fetches the channel/DM sidebar list for the active team and provides it to all children. */
export function ChannelsProvider({ children }: { children: ReactNode }) {
  const matches = useMatches()
  const teamId = getActiveTeamId(matches)
  const { user } = useAuth()
  const { subscribe } = useWs()
  const myUserId = user?.id ?? ""

  const [state, setState] = useState<ChannelsState>({ status: "loading" })
  const generation = useRef(0)

  const load = useCallback((tid: string, uid: string) => {
    const current = ++generation.current
    void fetchChannels(tid, uid).then((next) => {
      if (current === generation.current) setState(next)
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

  const value = useMemo(() => {
    const loaded = state.status === "loaded" && state.forTeamId === teamId
    const failed = state.status === "error" && state.forTeamId === teamId
    return {
      channels: loaded ? state.channels : [],
      dms: loaded ? state.dms : [],
      memberNames: loaded ? state.memberNames : {},
      loading: !!teamId && !loaded && !failed,
      failed,
      reload,
    }
  }, [state, teamId, reload])

  return <ChannelsContext.Provider value={value}>{children}</ChannelsContext.Provider>
}
