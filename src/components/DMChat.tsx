import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff } from 'lucide-react';

export type ChatThread = { id: string; participants: { id: string; name: string; profile_image?: string }[]; };
export type ChatMessage = {
  id: string; threadId?: string; senderId?: string; sender_id?: string; content: string;
  messageType?: 'text' | 'image' | 'audio'; createdAt?: string; created_at?: string;
  readByRecipient?: boolean; readByRecipients?: { user_id: string; read: boolean }[];
};

type DMChatProps =
  | { threadId: string; otherUser: { id: string; name: string; profile_image?: string } }
  | { threadId: string; otherUser: { threadTitle: string; threadType: string } };

type DMUser = { id: string; name: string; profile_image?: string };

export default function DMChat({ threadId, otherUser }: DMChatProps) {
  const { t, i18n } = useTranslation();
  const { currentLanguage } = useLanguage();
  const getSpeechLang = () => {
    const lang = currentLanguage || i18n.language || 'en';
    const langMap: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', as: 'as-IN', bn: 'bn-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', or: 'or-IN', pa: 'pa-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN' };
    return langMap[lang] || lang;
  };
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const initialLoadRef = useRef(true);
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !threadId) return;
    fetchMessages(true);
    const channel = supabase.channel('chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, () => { fetchMessages(false); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, user]);

  useEffect(() => {
    if (!initialLoadRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  if (!user) {
    return <div className="flex items-center justify-center h-full text-[var(--muted)]">Sign in to chat.</div>;
  }

  async function fetchMessages(isInitial = false) {
    if (!threadId || !user) return;
    if (isInitial) setLoading(true);
    const res = await fetch(`/api/chat/messages?threadId=${threadId}&limit=50&order=asc&userId=${user.id}`);
    const json = await res.json();
    setMessages(json.messages || []);
    if (isInitial) {
      setLoading(false);
      initialLoadRef.current = false;
      setTimeout(() => {
        if (messagesContainerRef.current) messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }, 50);
    }
  }

  async function sendMessage() {
    if (!input.trim() || sending || !user) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    await fetch('/api/chat/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId, senderId: user.id, content }) });
    setSending(false);
    inputRef.current?.focus();
  }

  function handleMicClick() {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    let SpeechRecognitionCtor: typeof SpeechRecognition | undefined;
    if (typeof window !== 'undefined') SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) { alert(t('dmChat.speechNotSupported')); return; }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = getSpeechLang();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      if (event.results.length > 0) setInput(prev => prev ? prev + ' ' + event.results[0][0].transcript : event.results[0][0].transcript);
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  type GroupUser = { threadTitle: string; threadType: string };
  const isGroup = (obj: unknown): obj is GroupUser => typeof obj === 'object' && obj !== null && 'threadType' in obj && (obj as { threadType?: unknown }).threadType === 'group';
  const isDM = (obj: unknown): obj is DMUser => typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj;

  // Header info
  let headerName = 'Chat';
  let headerSub = '';
  let headerAvatarEl: React.ReactNode = null;

  let participants: DMUser[] = [];
  if (typeof window !== 'undefined' && (window as any).__DMCHAT_PARTICIPANTS) participants = (window as any).__DMCHAT_PARTICIPANTS;

  if (isGroup(otherUser)) {
    headerName = otherUser.threadTitle || 'Group Chat';
    headerSub = `${participants.length} members`;
    headerAvatarEl = (
      <div className="flex -space-x-2">
        {participants.slice(0, 3).map((p, idx) => (
          p.profile_image
            ? <img key={p.id} src={p.profile_image} alt={p.name} className="w-9 h-9 rounded-full object-cover border-2 border-[var(--card)]" style={{ zIndex: 10 - idx }} />
            : <div key={p.id} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 border-[var(--card)] text-white" style={{ background: 'linear-gradient(135deg, var(--heritage-gold), var(--heritage-accent))', zIndex: 10 - idx }}>{p.name?.[0]?.toUpperCase()}</div>
        ))}
      </div>
    );
  } else if (isDM(otherUser)) {
    headerName = otherUser.name || 'Unknown User';
    headerSub = 'Direct Message';
    headerAvatarEl = otherUser.profile_image
      ? <img src={otherUser.profile_image} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--heritage-gold)]/30" />
      : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--heritage-gold), var(--heritage-accent))' }}>{otherUser.name?.[0]?.toUpperCase()}</div>;
  }

  function formatTime(dateStr: string) {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  const groupMode = isGroup(otherUser);

  return (
    <div className="flex flex-col h-full w-full relative" style={{ background: 'var(--bg-2)' }}>
      {/* Members slide-in panel (group only) */}
      <AnimatePresence>
        {showMembers && groupMode && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20"
              style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
              onClick={() => setShowMembers(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute right-0 top-0 bottom-0 z-30 flex flex-col"
              style={{ width: '280px', background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h3 className="font-bold text-[var(--text)]" style={{ fontFamily: 'serif' }}>Members</h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{participants.length} participant{participants.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setShowMembers(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {/* Member list */}
              <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                {participants.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                    style={{ cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {p.profile_image
                      ? <img src={p.profile_image} alt={p.name} className="w-10 h-10 rounded-full object-cover shrink-0 ring-2" />
                      : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--heritage-gold), var(--heritage-accent))' }}>{p.name?.[0]?.toUpperCase() || '?'}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{p.name}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 shrink-0" style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div className="shrink-0">{headerAvatarEl}</div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-[var(--text)] truncate" style={{ fontFamily: 'serif', fontSize: '1.05rem' }}>{headerName}</h2>
          <p className="text-xs text-[var(--muted)]">{headerSub}</p>
        </div>
        <div className="flex items-center gap-2">
          {groupMode && (
            <button
              onClick={() => setShowMembers(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={showMembers
                ? { background: 'linear-gradient(135deg, var(--heritage-gold), var(--heritage-accent))', color: '#fff' }
                : { background: 'var(--bg-2)', color: 'var(--muted)', border: '1px solid var(--border)' }
              }
              title="View group members"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Members
            </button>
          )}
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3" style={{ minHeight: 0, scrollBehavior: 'smooth' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--heritage-gold)', borderTopColor: 'transparent' }} />
            <p className="text-sm text-[var(--muted)]">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, var(--heritage-gold)/20, var(--heritage-accent)/10)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--heritage-gold)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <p className="font-semibold text-[var(--text)] mb-1">Start the conversation</p>
            <p className="text-sm text-[var(--muted)]">Send a message to get started</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const senderId = msg.sender_id || msg.senderId;
              const isMine = senderId === user.id;
              const createdAt = msg.created_at || msg.createdAt || '';
              const timeStr = formatTime(createdAt);
              const prevMsg = messages[index - 1];
              const prevSenderId = prevMsg ? (prevMsg.sender_id || prevMsg.senderId) : null;
              const isGrouped = prevSenderId === senderId;

              let senderProfile: DMUser | undefined;
              if (participants.length > 0 && !isMine) senderProfile = participants.find(p => p.id === senderId);

              let readStatus = null;
              if (isMine && Array.isArray(msg.readByRecipients)) {
                const allRead = msg.readByRecipients.length > 0 && msg.readByRecipients.every(r => r.read);
                if (allRead) readStatus = <span className="text-green-400 text-xs">✓✓</span>;
                else readStatus = <span className="text-[var(--muted)] text-xs">✓</span>;
              } else if (isMine && msg.readByRecipient) {
                readStatus = <span className="text-green-400 text-xs">✓✓</span>;
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
                >
                  {/* Avatar (others only) */}
                  {!isMine && (
                    <div className="shrink-0 mb-1" style={{ opacity: isGrouped ? 0 : 1 }}>
                      {senderProfile?.profile_image
                        ? <img src={senderProfile.profile_image} alt={senderProfile.name} className="w-7 h-7 rounded-full object-cover" />
                        : <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--heritage-gold), var(--heritage-accent))' }}>{(senderProfile?.name || '?')[0]?.toUpperCase()}</div>
                      }
                    </div>
                  )}
                  {/* Bubble */}
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    {!isGrouped && !isMine && senderProfile && (
                      <span className="text-xs font-semibold mb-1 px-1" style={{ color: 'var(--heritage-gold)' }}>{senderProfile.name}</span>
                    )}
                    <div
                      className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words w-fit"
                      style={isMine ? {
                        background: 'linear-gradient(135deg, var(--heritage-gold), var(--heritage-accent))',
                        color: '#fff',
                        borderBottomRightRadius: isGrouped ? '1rem' : '0.25rem',
                        boxShadow: '0 2px 12px rgba(176,141,85,0.25)',
                      } : {
                        background: 'var(--card)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        borderBottomLeftRadius: isGrouped ? '1rem' : '0.25rem',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      }}
                    >
                      {msg.content.split(/\r\n|\r|\n/).map((line, idx, arr) => (
                        <span key={idx}>{line}{idx < arr.length - 1 && <br />}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 px-1">
                      <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{timeStr}</span>
                      {isMine && readStatus}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 px-4 py-3" style={{ background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl transition-all" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          {/* Mic */}
          <button
            type="button"
            onClick={handleMicClick}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
            style={isListening ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } : { color: 'var(--muted)' }}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-sm py-1"
            style={{ color: 'var(--text)' }}
            placeholder={isListening ? '🎙 Listening...' : 'Type a message...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={sending}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />

          {/* Send button */}
          <motion.button
            type="button"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            whileHover={!sending && input.trim() ? { scale: 1.08 } : {}}
            whileTap={!sending && input.trim() ? { scale: 0.93 } : {}}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
            style={input.trim() && !sending
              ? { background: 'linear-gradient(135deg, var(--heritage-gold), var(--heritage-accent))', color: '#fff', boxShadow: '0 2px 8px rgba(176,141,85,0.35)' }
              : { background: 'var(--bg-1)', color: 'var(--muted)', opacity: 0.5, cursor: 'not-allowed' }
            }
            title="Send message"
          >
            {sending ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin border-white" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
        {isListening && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mt-2 px-3">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1 h-3 rounded-full bg-red-400" animate={{ scaleY: [1, 1.8, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
            <span className="text-xs text-red-400 font-medium">Listening...</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
