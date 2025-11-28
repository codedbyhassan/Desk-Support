import React, { useRef, useEffect, useState } from 'react'
import { Send, X, MessageSquare } from 'lucide-react'
import type { ChatMessage } from '@/hooks/useVideoChat'

interface ChatPanelProps {
  isOpen: boolean
  messages: ChatMessage[]
  isTyping: boolean
  onSendMessage: (text: string) => void
  onSendTypingIndicator: () => void
  onClose: () => void
  unreadCount?: number
}

export default function ChatPanel({
  isOpen,
  messages,
  isTyping,
  onSendMessage,
  onSendTypingIndicator,
  onClose,
  unreadCount = 0,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const [unreadLocal, setUnreadLocal] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Update unread count
  useEffect(() => {
    if (!isOpen && unreadCount > 0) {
      setUnreadLocal(unreadCount)
    } else if (isOpen) {
      setUnreadLocal(0)
    }
  }, [isOpen, unreadCount])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    onSendMessage(inputValue)
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    onSendTypingIndicator()
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => onClose()}
        className="relative inline-flex items-center justify-center"
        title="Open chat"
      >
        <MessageSquare className="w-6 h-6" />
        {unreadLocal > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadLocal > 99 ? '99+' : unreadLocal}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  msg.isOwn
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-700/50 text-slate-100 rounded-bl-none'
                } break-words`}
              >
                {!msg.isOwn && <p className="text-xs font-semibold text-blue-300 mb-1">{msg.userName}</p>}
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs opacity-70 mt-1">{formatTime(msg.timestamp)}</p>
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span className="text-xs text-slate-400">Someone is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700/50 p-3 bg-slate-950/50">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all max-h-24"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="flex-shrink-0 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
