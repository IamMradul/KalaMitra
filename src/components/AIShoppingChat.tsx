
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles, Loader2, RefreshCw, Trash2, Mic } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useLanguage } from './LanguageProvider'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Database } from '@/lib/supabase'

type Product = Database['public']['Tables']['products']['Row']

interface Message {
  id: string
  type: 'user' | 'ai'
  text: string
  products?: Product[]
  timestamp: Date
}
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}
export default function AIShoppingChat() {
  const { currentLanguage } = useLanguage()
  const { t } = useTranslation()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  // Speech recognition state
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  // Map app language to BCP-47 code
  const langMap: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    assamese: 'as-IN',
    bengali: 'bn-IN',
    bodo: 'brx-IN',
    dogri: 'doi-IN',
    gujarati: 'gu-IN',
    kannad: 'kn-IN',
    kashmiri: 'ks-IN',
    konkani: 'kok-IN',
    maithili: 'mai-IN',
    malyalam: 'ml-IN',
    manipuri: 'mni-IN',
    marathi: 'mr-IN',
    nepali: 'ne-NP',
    oriya: 'or-IN',
    punjabi: 'pa-IN',
    sanskrit: 'sa-IN',
    santhali: 'sat-IN',
    sindhi: 'sd-IN',
    tamil: 'ta-IN',
    telgu: 'te-IN',
    urdu: 'ur-IN',
    // Short codes
    as: 'as-IN', bn: 'bn-IN', brx: 'brx-IN', doi: 'doi-IN', gu: 'gu-IN', kn: 'kn-IN', ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', ml: 'ml-IN', mni: 'mni-IN', mr: 'mr-IN', ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN',
  }

  const handleStartListening = () => {
    const speechLang = langMap[currentLanguage] || currentLanguage || 'en-IN'
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.')
      return
    }
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      alert('Speech recognition not supported in this browser.')
      return
    }
    const recognition: SpeechRecognition = new SpeechRecognitionCtor()
    recognition.lang = speechLang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
    }
    recognition.onerror = () => {
      setListening(false)
    }
    recognition.onend = () => {
      setListening(false)
    }
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }
  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
    }
  }
  const [sessionId, setSessionId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate session ID on mount
  useEffect(() => {
    const stored = localStorage.getItem('ai_chat_session_id')
    if (stored) {
      setSessionId(stored)
    } else {
      const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('ai_chat_session_id', newId)
      setSessionId(newId)
    }
  }, [])

  // Load chat history when opened (only for logged-in users)
  useEffect(() => {
    if (isOpen && sessionId && messages.length === 0) {
      if (user) {
        // Load history only for logged-in users
        loadChatHistory()
      } else {
        // Show greeting with login warning for anonymous users
        showAnonymousGreeting()
      }
    }
  }, [isOpen, sessionId, user])

  // Load previous conversation from Supabase (logged-in users only)
  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true)
      
      const query = supabase
        .from('conversation_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50) // Load last 50 messages

      const { data, error } = await query

      if (error) {
        console.error('Error loading chat history:', error)
        showInitialGreeting()
        return
      }

      if (data && data.length > 0) {
        // Convert database records to Message format
        const loadedMessages: Message[] = data.map((record) => ({
          id: record.id,
          type: record.role === 'user' ? 'user' : 'ai',
          text: record.message,
          products: record.query_context?.productIds ? [] : undefined, // We don't store full product data
          timestamp: new Date(record.created_at),
        }))

        setMessages(loadedMessages)
      } else {
        // No history found, show greeting
        showInitialGreeting()
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
      showInitialGreeting()
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Show initial greeting for logged-in users
  const showInitialGreeting = () => {
    setMessages([{
      id: '1',
      type: 'ai',
      text: t('aiChat.greetingLoggedIn'),
      timestamp: new Date(),
    }])
  }

  // Show greeting for anonymous users with login warning
  const showAnonymousGreeting = () => {
    setMessages([{
      id: '1',
      type: 'ai',
      text: t('aiChat.greetingAnonymous'),
      timestamp: new Date(),
    }])
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Clear chat history and start fresh
  const handleClearHistory = () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('ai_chat_session_id', newSessionId)
    setSessionId(newSessionId)
    setMessages([])
    // Show appropriate greeting based on login status
    if (user) {
      showInitialGreeting()
    } else {
      showAnonymousGreeting()
    }
  }

  // Delete conversation from database permanently
  const handleDeleteConversation = async () => {
    if (!user) {
      // Anonymous users don't have database history
      handleClearHistory()
      return
    }

    const confirmed = window.confirm(
      '🗑️ Delete this conversation permanently?\n\nThis will remove all messages from your history and cannot be undone.'
    )
    
    if (!confirmed) return

    try {
      setIsLoading(true)

      // Delete from database via API
      const response = await fetch('/api/ai-chat/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }

      // Clear UI and start fresh
      handleClearHistory()
      
      console.log('Conversation deleted from database:', sessionId)
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Failed to delete conversation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Prepare conversation history (last 10 messages for better context)
      // This includes loaded history from previous sessions
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        message: m.text,
      }))

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: input,
          userId: user?.id || null,
          sessionId,
          conversationHistory,
        }),
      })

      const data = await response.json()

      // Update session ID if returned from server
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId)
        localStorage.setItem('ai_chat_session_id', data.sessionId)
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: data.message || data.error || 'Sorry, I encountered an error.',
        products: data.products || [],
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: 'Sorry, I encountered an error. Please try again!',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 flex items-center justify-center group hover:scale-110"
        whileHover={{ rotate: 15 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6 md:w-7 md:h-7" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-40 w-[90vw] max-w-md h-[70vh] max-h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t('aiChat.headerTitle')}</h3>
                  <p className="text-xs text-white/80">{t('aiChat.headerSubtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearHistory}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Start new conversation (keeps history in database)"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                {user && (
                  <button
                    onClick={handleDeleteConversation}
                    className="p-2 hover:bg-red-600/30 rounded-lg transition-colors"
                    title="Delete conversation permanently from database"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Anonymous User Warning Banner */}
            {!user && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-yellow-800 dark:text-yellow-200">
                  <span>⚠️</span>
                  <span>{t('aiChat.notSavedBanner')}</span>
                </div>
                <Link 
                  href="/auth/signin"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  Login
                </Link>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('aiChat.loadingHistory')}</p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${message.type === 'user' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white'} rounded-2xl px-4 py-2.5 shadow-md`}>
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    
                    {/* Product Cards */}
                    {message.products && message.products.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.products.slice(0, 3).map((product: Product) => (
                          <Link
                            key={product.id}
                            href={`/product/${product.id}`}
                            onClick={() => setIsOpen(false)}
                          >
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              className="bg-gray-50 dark:bg-gray-600 rounded-lg p-2 flex items-center space-x-3 hover:shadow-lg transition-shadow cursor-pointer"
                            >
                              {product.image_url && (
                                <img
                                  src={product.image_url}
                                  alt={product.title}
                                  className="w-12 h-12 rounded object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                  {product.title}
                                </p>
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                                  ₹{product.price}
                                </p>
                              </div>
                            </motion.div>
                          </Link>
                        ))}
                        {message.products.length > 3 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {t('aiChat.moreProducts', { count: message.products.length - 3 })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white dark:bg-gray-700 rounded-2xl px-4 py-3 shadow-md flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t('aiChat.analyzingProducts')}
                    </span>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
              </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('aiChat.inputPlaceholder')}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 pr-10 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={listening ? handleStopListening : handleStartListening}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white hover:bg-gray-100"
                    title={listening ? 'Listening...' : 'Speak'}
                  >
                    <Mic className={`w-5 h-5 ${listening ? 'animate-pulse text-red-500' : 'text-blue-500'}`} />
                  </button>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
