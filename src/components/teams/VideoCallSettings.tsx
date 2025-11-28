import React, { useEffect, useState } from 'react'
import { X, Settings as SettingsIcon, Volume2, Mic, Video } from 'lucide-react'

interface VideoCallSettingsProps {
  onClose: () => void
  onAudioDeviceChange?: (deviceId: string) => void
  onVideoDeviceChange?: (deviceId: string) => void
  onAudioOutputChange?: (deviceId: string) => void
  currentAudioInput?: string
  currentVideoInput?: string
  currentAudioOutput?: string
}

export default function VideoCallSettings({
  onClose,
  onAudioDeviceChange,
  onVideoDeviceChange,
  onAudioOutputChange,
  currentAudioInput,
  currentVideoInput,
  currentAudioOutput,
}: VideoCallSettingsProps) {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudio, setSelectedAudio] = useState(currentAudioInput || '')
  const [selectedVideo, setSelectedVideo] = useState(currentVideoInput || '')
  const [selectedOutput, setSelectedOutput] = useState(currentAudioOutput || '')

  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter(d => d.kind === 'audioinput')
        const videoInputs = devices.filter(d => d.kind === 'videoinput')
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput')

        setAudioDevices(audioInputs)
        setVideoDevices(videoInputs)
        setAudioOutputDevices(audioOutputs)

        // Set defaults
        if (!selectedAudio && audioInputs.length > 0) {
          setSelectedAudio(audioInputs[0].deviceId)
        }
        if (!selectedVideo && videoInputs.length > 0) {
          setSelectedVideo(videoInputs[0].deviceId)
        }
        if (!selectedOutput && audioOutputs.length > 0) {
          setSelectedOutput(audioOutputs[0].deviceId)
        }
      } catch (err) {
        console.error('Failed to enumerate devices:', err)
      }
    }

    enumerateDevices()

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices)
    }
  }, [])

  const handleAudioChange = (deviceId: string) => {
    setSelectedAudio(deviceId)
    onAudioDeviceChange?.(deviceId)
  }

  const handleVideoChange = (deviceId: string) => {
    setSelectedVideo(deviceId)
    onVideoDeviceChange?.(deviceId)
  }

  const handleOutputChange = (deviceId: string) => {
    setSelectedOutput(deviceId)
    onAudioOutputChange?.(deviceId)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl max-w-md w-full border border-slate-700/50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* Microphone Selection */}
          <div>
            <label className="flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-slate-200">Microphone</span>
            </label>
            <select
              value={selectedAudio}
              onChange={(e) => handleAudioChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 text-white rounded-lg border border-slate-600/50 hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {audioDevices.length === 0 ? (
                <option value="">No microphones found</option>
              ) : (
                audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 6)}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Camera Selection */}
          <div>
            <label className="flex items-center gap-2 mb-3">
              <Video className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-slate-200">Camera</span>
            </label>
            <select
              value={selectedVideo}
              onChange={(e) => handleVideoChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 text-white rounded-lg border border-slate-600/50 hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {videoDevices.length === 0 ? (
                <option value="">No cameras found</option>
              ) : (
                videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 6)}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Speaker Selection */}
          <div>
            <label className="flex items-center gap-2 mb-3">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-slate-200">Speaker</span>
            </label>
            <select
              value={selectedOutput}
              onChange={(e) => handleOutputChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 text-white rounded-lg border border-slate-600/50 hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {audioOutputDevices.length === 0 ? (
                <option value="">No speakers found</option>
              ) : (
                audioOutputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${device.deviceId.slice(0, 6)}`}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-700/50 text-white font-semibold hover:bg-slate-600/50 transition-all duration-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
