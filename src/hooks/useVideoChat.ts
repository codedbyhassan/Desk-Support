import { useCallback, useEffect, useRef, useState } from 'react'
import { SupabaseSignalingClient } from '@/services/video/supabase-signaling'

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: Date
  isOwn: boolean
}

/**
 * Hook for managing chat messages in video calls
 * Sends and receives messages through the signaling client
 */
export function useVideoChat(
  signalingClient: SupabaseSignalingClient | null,
  userId: string | null,
  userName: string = 'You'
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageHandlerRegisteredRef = useRef(false)

  // Register message handler for chat messages
  useEffect(() => {
    if (!signalingClient || messageHandlerRegisteredRef.current) return

    signalingClient.onMessage((msg: any) => {
      if (msg.type === 'chat-message') {
        const { from_user_id: fromUserId, payload } = msg
        const { text, userName: senderName, timestamp } = payload

        const chatMsg: ChatMessage = {
          id: `${fromUserId}-${timestamp}`,
          userId: fromUserId,
          userName: senderName || `User ${fromUserId.slice(0, 6)}`,
          text,
          timestamp: new Date(timestamp),
          isOwn: fromUserId === userId,
        }

        setMessages(prev => [...prev, chatMsg])
      }

      if (msg.type === 'typing-indicator') {
        const { from_user_id: fromUserId, payload } = msg
        if (fromUserId !== userId) {
          setIsTyping(true)
          setTimeout(() => setIsTyping(false), 2000)
        }
      }
    })

    messageHandlerRegisteredRef.current = true
  }, [signalingClient, userId])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!signalingClient || !userId || !text.trim()) return

      try {
        await signalingClient.send({
          type: 'chat-message',
          payload: {
            text: text.trim(),
            userName,
            timestamp: new Date().toISOString(),
          },
        } as any)

        // Add own message to local state immediately
        const ownMessage: ChatMessage = {
          id: `${userId}-${Date.now()}`,
          userId,
          userName,
          text: text.trim(),
          timestamp: new Date(),
          isOwn: true,
        }

        setMessages(prev => [...prev, ownMessage])
      } catch (err) {
        console.error('[useVideoChat] Failed to send message:', err)
      }
    },
    [signalingClient, userId, userName]
  )

  const sendTypingIndicator = useCallback(() => {
    if (!signalingClient || !userId) return

    try {
      signalingClient.send({
        type: 'typing-indicator',
        payload: {},
      } as any)
    } catch (err) {
      console.error('[useVideoChat] Failed to send typing indicator:', err)
    }
  }, [signalingClient, userId])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isTyping,
    sendMessage,
    sendTypingIndicator,
    clearMessages,
  }
}
