// Records one voice message at a time with MediaRecorder. The microphone is released as soon as
// a recording stops, is discarded, or the composer closes, so the browser's mic indicator goes off.

import { useCallback, useEffect, useRef, useState } from "react"

import {
  describeMicError,
  MAX_RECORDING_MS,
  MIN_RECORDING_MS,
  pickRecordingMime,
  toRecordingFile,
} from "../utils/recording"

export type RecorderStatus = "idle" | "starting" | "recording"

type RecorderOptions = {
  /** A finished recording, at least MIN_RECORDING_MS long. */
  onRecorded: (file: File) => void
  /** The microphone couldn't be used; the text says why. */
  onError: (message: string) => void
}

type Session = { recorder: MediaRecorder; keep: boolean }

/** True when this browser can record one of the formats in RECORDING_MIMES. */
export function isRecordingSupported(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    pickRecordingMime((mime) => MediaRecorder.isTypeSupported(mime)) !== null
  )
}

function release(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop())
}

export function useAudioRecorder(options: RecorderOptions) {
  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [startedAt, setStartedAt] = useState(0)
  const [now, setNow] = useState(0)

  const sessionRef = useRef<Session | null>(null)
  // Bumped by every stop or discard, so a start still waiting for the microphone is dropped.
  const attemptRef = useRef(0)
  // The latest callbacks, for the recorder's own events.
  const optionsRef = useRef(options)
  useEffect(() => { optionsRef.current = options })

  const start = useCallback(async () => {
    if (sessionRef.current) return
    const attempt = ++attemptRef.current
    setStatus("starting")

    let stream: MediaStream
    let recorder: MediaRecorder
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch (error) {
      if (attempt !== attemptRef.current) return
      setStatus("idle")
      optionsRef.current.onError(describeMicError(error))
      return
    }
    if (attempt !== attemptRef.current) return release(stream) // discarded while asking

    const mime = pickRecordingMime((type) => MediaRecorder.isTypeSupported(type))
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    } catch (error) {
      release(stream)
      setStatus("idle")
      optionsRef.current.onError(describeMicError(error))
      return
    }

    const session: Session = { recorder, keep: false }
    const chunks: Blob[] = []
    const began = Date.now()
    sessionRef.current = session

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onstop = () => {
      release(stream)
      if (sessionRef.current === session) sessionRef.current = null
      setStatus("idle")
      const long = Date.now() - began >= MIN_RECORDING_MS
      if (session.keep && long && chunks.length > 0) {
        const type = recorder.mimeType || mime || "audio/webm"
        optionsRef.current.onRecorded(toRecordingFile(chunks, type, new Date(began)))
      }
    }

    // A chunk every second: a stop never has to wait for one long buffer.
    recorder.start(1000)
    setStartedAt(began)
    setNow(began)
    setStatus("recording")
  }, [])

  const finish = useCallback((keep: boolean) => {
    attemptRef.current++
    const session = sessionRef.current
    if (!session) {
      setStatus("idle")
      return
    }
    session.keep = keep
    if (session.recorder.state !== "inactive") session.recorder.stop()
  }, [])

  /** Stops and hands the recording to onRecorded. */
  const stop = useCallback(() => finish(true), [finish])
  /** Stops and throws the recording away. */
  const cancel = useCallback(() => finish(false), [finish])

  // The clock while recording, and the stop at the limit (the recording is kept).
  useEffect(() => {
    if (status !== "recording") return
    const timer = setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (time - startedAt >= MAX_RECORDING_MS) stop()
    }, 250)
    return () => clearInterval(timer)
  }, [status, startedAt, stop])

  // Closing the composer (another channel, sign-out) discards a recording and frees the mic.
  useEffect(() => cancel, [cancel])

  return {
    status,
    elapsedMs: status === "recording" ? now - startedAt : 0,
    start,
    stop,
    cancel,
  }
}
