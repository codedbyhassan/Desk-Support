import { useEffect, useRef, useState } from 'react'

/**
 * Hook to detect audio activity from a MediaStream
 * Returns audio level (0-100) and whether audio is currently active
 */
export function useAudioLevel(stream: MediaStream | null) {
  const [audioLevel, setAudioLevel] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!stream) {
      setAudioLevel(0)
      setIsActive(false)
      return
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    
    audioContextRef.current = audioContext
    analyserRef.current = analyser
    dataArrayRef.current = dataArray

    const detectAudioActivity = () => {
      if (!analyserRef.current || !dataArrayRef.current) return

      analyserRef.current.getByteFrequencyData(dataArrayRef.current)

      // Calculate average volume
      const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length
      const level = Math.round((average / 255) * 100)

      setAudioLevel(level)
      setIsActive(level > 10) // Consider active if above 10%

      animationFrameRef.current = requestAnimationFrame(detectAudioActivity)
    }

    detectAudioActivity()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      source.disconnect()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stream])

  return { audioLevel, isActive }
}
