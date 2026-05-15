import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Send, Mic } from 'lucide-react';

export type ChatThread = {
  id: string;
  participants: { id: string; name: string; profile_image?: string }[];
};
export type ChatMessage = {
  id: string;
  threadId?: string;
  senderId?: string;
  sender_id?: string;
  content: string;
  messageType?: 'text' | 'image' | 'audio';
  createdAt?: string;
  created_at?: string;
  readByRecipient?: boolean;
  readByRecipients?: { user_id: string; read: boolean }[];
};

type DMChatProps =
  | { threadId: string; otherUser: { id: string; name: string; profile_image?: string } }
  | { threadId: string; otherUser: { threadTitle: string; threadType: string } };

export default function DMChat({ threadId, otherUser }: DMChatProps) {
  // Language support for mic
  const { t, i18n } = useTranslation();
  const { currentLanguage } = useLanguage();
  // Map app language to BCP-47
  const getSpeechLang = () => {
    const lang = currentLanguage || i18n.language || 'en';
    const langMap: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN', assamese: 'as-IN', bengali: 'bn-IN', bodo: 'brx-IN', dogri: 'doi-IN', gujarati: 'gu-IN', kannad: 'kn-IN', kashmiri: 'ks-IN', konkani: 'kok-IN', maithili: 'mai-IN', malyalam: 'ml-IN', manipuri: 'mni-IN', marathi: 'mr-IN', nepali: 'ne-NP', oriya: 'or-IN', punjabi: 'pa-IN', sanskrit: 'sa-IN', santhali: 'sat-IN', sindhi: 'sd-IN', tamil: 'ta-IN', telgu: 'te-IN', urdu: 'ur-IN',
      as: 'as-IN', bn: 'bn-IN', brx: 'brx-IN', doi: 'doi-IN', gu: 'gu-IN', kn: 'kn-IN', ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', ml: 'ml-IN', mni: 'mni-IN', mr: 'mr-IN', ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN',
    };
    return langMap[lang] || lang;
  };
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const initialLoadRef = useRef(true);
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !threadId) return;
    fetchMessages(true);

    // Supabase real-time subscription for new messages
    const channel = supabase.channel('chat_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload) => {
        fetchMessages(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, user]);

  useEffect(() => {
    // Only scroll if not initial load
    if (!initialLoadRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Guard: if user is not loaded, don't render chat
  if (!user) {
    return <div className="flex items-center justify-center h-full text-gray-400">{t('dm.signInToChat', 'Sign in to use chat.')}</div>;
  }

  async function fetchMessages(isInitial = false) {
    if (!threadId || !user) return;
    if (isInitial) setLoading(true);
    // Fetch messages ordered by created_at ASC so new messages are at the bottom
    const res = await fetch(`/api/chat/messages?threadId=${threadId}&limit=50&order=asc&userId=${user.id}`);
    const json = await res.json();
    setMessages(json.messages || []);
    if (isInitial) {
      setLoading(false);
      initialLoadRef.current = false;
      // Scroll to bottom instantly on initial load
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }

  async function sendMessage() {
    if (!input.trim() || sending || !user) return;
    setSending(true);
    await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, senderId: user.id, content: input })
    });
  setInput('');
  setSending(false);
  // No manual refresh needed; real-time updates will handle new messages
  }

  function handleMicClick() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    let SpeechRecognitionCtor;
    if (typeof window !== 'undefined') {
      SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    }
    if (!SpeechRecognitionCtor) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = getSpeechLang();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      if (event.results.length > 0) {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? prev + ' ' + transcript : transcript);
      }
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  // Accept threadTitle prop for group chats
  // Type guards for DM vs group
  type GroupUser = { threadTitle: string; threadType: string };
  type DMUser = { id: string; name: string; profile_image?: string };
  const isGroup = (obj: unknown): obj is GroupUser => {
    if (typeof obj === 'object' && obj !== null && 'threadType' in obj) {
      const o = obj as { threadType?: unknown };
      return o.threadType === 'group';
    }
    return false;
  };
  const isDM = (obj: unknown): obj is DMUser => {
    if (typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj) {
      const o = obj as { id?: unknown; name?: unknown };
      return typeof o.id === 'string' && typeof o.name === 'string';
    }
    return false;
  };

  let headerAvatar = null;
  let headerTitle = '';
  // For group chats, show combined avatars
  if (isGroup(otherUser)) {
    // Try to get participants from window.__DMCHAT_PARTICIPANTS (set by DMPage)
    let participants: DMUser[] = [];
    if (typeof window !== 'undefined' && (window as { __DMCHAT_PARTICIPANTS?: DMUser[] }).__DMCHAT_PARTICIPANTS) {
      participants = (window as { __DMCHAT_PARTICIPANTS?: DMUser[] }).__DMCHAT_PARTICIPANTS!;
    }
    headerAvatar = (
      <div className="flex -space-x-2 shrink-0">
        {participants.slice(0, 3).map((p, idx) =>
          p.profile_image ? (
            <img key={p.id} src={p.profile_image} alt={p.name} className="w-10 h-10 rounded-full border-2 border-[var(--bg-2)] object-cover shadow-sm" style={{ zIndex: 10 - idx }} />
          ) : (
            <span key={p.id} className="w-10 h-10 rounded-full bg-[var(--bg-1)] text-[var(--heritage-gold)] flex items-center justify-center text-sm font-bold border-2 border-[var(--bg-2)] shadow-sm" style={{ zIndex: 10 - idx }}>{p.name?.[0] || '?'}</span>
          )
        )}
        {participants.length > 3 && (
          <span className="w-10 h-10 rounded-full bg-[var(--muted)] text-white flex items-center justify-center text-xs font-bold border-2 border-[var(--bg-2)] shadow-sm">+{participants.length - 3}</span>
        )}
      </div>
    );
    headerTitle = otherUser.threadTitle || 'Group Chat';
  } else if (isDM(otherUser)) {
    if (otherUser.profile_image) {
      headerAvatar = <img src={otherUser.profile_image} alt={otherUser.name || 'User'} className="w-10 h-10 shrink-0 rounded-full object-cover border-2 border-[var(--bg-2)] shadow-sm" />;
    } else {
      headerAvatar = <div className="w-10 h-10 shrink-0 rounded-full bg-[var(--bg-1)] flex items-center justify-center text-xl font-bold text-[var(--heritage-gold)] border border-[var(--border)] shadow-sm">{otherUser.name?.[0] || '?'}</div>;
    }
    headerTitle = otherUser.name || 'Unknown User';
  } else {
    headerAvatar = <div className="w-10 h-10 shrink-0 rounded-full bg-[var(--bg-1)] flex items-center justify-center text-xl font-bold text-[var(--heritage-gold)] border border-[var(--border)] shadow-sm">?</div>;
    headerTitle = 'Chat';
  }

  // Get participants for group chat
  let participants: DMUser[] = [];
  if (typeof window !== 'undefined' && (window as { __DMCHAT_PARTICIPANTS?: DMUser[] }).__DMCHAT_PARTICIPANTS) {
    participants = (window as { __DMCHAT_PARTICIPANTS?: DMUser[] }).__DMCHAT_PARTICIPANTS!;
  }

  return (
    <div className="flex flex-col h-full w-full rounded-2xl overflow-hidden bg-[var(--bg-2)] text-[var(--text)] relative" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex items-center gap-4 p-5 border-b border-[var(--border)] bg-[var(--card)] shadow-sm z-10">
        {headerAvatar}
        <span className="font-serif font-bold text-xl ml-2 truncate">{headerTitle}</span>
      </div>
      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-[var(--bg-2)]" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="text-center text-[var(--muted)] font-medium mt-10">{t('common.loading')}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-[var(--muted)] font-serif italic mt-10">{t('dm.noMessages')}</div>
        ) : (
          messages.map(msg => {
            // ...existing code...
            const senderId = msg.sender_id || msg.senderId;
            const createdAt = msg.created_at || msg.createdAt || '';
            let timeString = '';
            try {
              const date = new Date(createdAt);
              timeString = isNaN(date.getTime()) ? '' : date.toLocaleTimeString();
            } catch {
              timeString = '';
            }
            const isMine = senderId === user.id;
            // ...existing code...
            let readStatus = null;
            if (isMine && Array.isArray(msg.readByRecipients)) {
              const allRead = msg.readByRecipients.length > 0 && msg.readByRecipients.every(r => r.read);
              const someRead = msg.readByRecipients.some(r => r.read);
              readStatus = allRead ? (
                <span title="Read by all" className="text-green-500">&#10003;</span>
              ) : someRead ? (
                <span title="Read by some" className="text-gray-400">&#10003;</span>
              ) : null;
            } else if (isMine && msg.readByRecipient) {
              readStatus = <span title="Read" className="text-green-500">&#10003;</span>;
            }
            let senderProfile = null;
            if (participants.length > 0) {
              senderProfile = participants.find(p => p.id === senderId);
            }
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[80%] w-fit px-5 py-3 rounded-2xl shadow-sm text-base flex flex-col ${isMine ? 'bg-[var(--heritage-gold)] text-white ml-auto rounded-tr-sm' : 'bg-[var(--card)] text-[var(--text)] border border-[var(--border)] mr-auto rounded-tl-sm'}`}
              >
                {/* Sender avatar and name for group chats */}
                {participants.length > 0 && !isMine && senderProfile && (
                  <div className="flex items-center gap-2 mb-2">
                    {senderProfile.profile_image ? (
                      <img src={senderProfile.profile_image} alt={senderProfile.name} className="w-6 h-6 rounded-full border border-[var(--border)]" />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-[var(--bg-1)] flex items-center justify-center text-[10px] font-bold text-[var(--heritage-gold)] border border-[var(--border)]">{senderProfile.name?.[0] || '?'}</span>
                    )}
                    <span className="text-xs font-semibold text-[var(--muted)]">{senderProfile.name}</span>
                  </div>
                )}
                <span className="break-words">
                  {msg.content.split(/\r\n|\r|\n/).map((line, idx, arr) => (
                    <span key={idx}>
                      {line}
                      {idx < arr.length - 1 && <br />}
                    </span>
                  ))}
                </span>
                <div className="flex items-center justify-end gap-1 text-xs mt-1 opacity-70">
                  <span>{timeString}</span>
                  {isMine && readStatus}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Input */}
      <div className="flex items-center gap-3 p-4 border-t border-[var(--border)] bg-[var(--card)] z-10">
        <button
          type="button"
          onClick={handleMicClick}
          className={`p-2.5 rounded-full transition-all duration-200 ${isListening ? 'bg-orange-100 text-orange-600' : 'bg-[var(--bg-1)] text-[var(--muted)] hover:text-[var(--heritage-gold)] hover:bg-[var(--glass)] border border-[var(--border)]'}`}
          title={isListening ? t('dm.listening', 'Listening...') : t('dm.speakMessage', 'Speak message')}
        >
          <Mic className="w-5 h-5" />
        </button>
        <input
          type="text"
          className="flex-1 border border-[var(--border)] rounded-full px-5 py-3 bg-[var(--bg-1)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--heritage-gold)] focus:border-transparent transition-all shadow-sm"
          placeholder={t('dm.typeMessage', 'Type a message...')}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
        />
        <button
          type="button"
          onClick={sendMessage}
          className={`p-3 rounded-full transition-all duration-200 ${sending || !input.trim() ? 'bg-[var(--bg-1)] text-[var(--muted)] border border-[var(--border)] opacity-50 cursor-not-allowed' : 'bg-[var(--heritage-gold)] text-white hover:scale-105 shadow-md'}`}
          disabled={sending || !input.trim()}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
