// Desktop UI and layout is preserved by the conditional rendering above. No further code changes needed for this step.
"use client"
import DMChat from '@/components/DMChat';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function handleResize() { setIsMobile(window.innerWidth < breakpoint); }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);
  return isMobile;
}

function DMPageContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  type UserProfile = { id: string; name: string; profile_image?: string };
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  type ThreadType = 'dm' | 'group';
  type ThreadParticipant = UserProfile;
  type ThreadMessage = { id: string; content: string; created_at: string; sender_id: string; };
  type Thread = {
    id: string; type: ThreadType; created_at: string; title?: string;
    participants: ThreadParticipant[]; other?: ThreadParticipant | null;
    lastMessage?: ThreadMessage | null; isUnread: boolean;
  };
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const searchParams = useSearchParams();
  const targetUserId = searchParams?.get('userId');
  const [recipientProfile, setRecipientProfile] = useState<UserProfile | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const isMobile = useIsMobile();
  const [showThreadListMobile, setShowThreadListMobile] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchThreads();
    const channel = supabase.channel('dm_sidebar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => { fetchThreads(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user.id}` }, () => { fetchThreads(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    async function fetchRecipient() {
      if (!targetUserId) return;
      const { data } = await supabase.from('profiles').select('id, name, profile_image').eq('id', targetUserId).single();
      if (data) setRecipientProfile(data);
    }
    if (targetUserId) fetchRecipient();
  }, [targetUserId]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('id, name, profile_image').then(({ data }) => {
      setAllUsers((data as UserProfile[] || []).filter((u) => u.id !== user.id));
    });
  }, [user]);

  useEffect(() => {
    if (!user || !targetUserId || targetUserId === user.id) return;
    const fetchOrCreateThread = async () => {
      const res = await fetch('/api/chat/thread', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantIds: [user.id, targetUserId] }) });
      const json = await res.json();
      let recipient = recipientProfile;
      if (!recipient) {
        const { data } = await supabase.from('profiles').select('id, name, profile_image').eq('id', targetUserId).single();
        recipient = data || { id: targetUserId, name: 'User' };
      }
      if (json.threadId) {
        setSelectedThread({ id: json.threadId, type: 'dm', created_at: new Date().toISOString(), participants: [user as UserProfile, recipient as UserProfile], other: recipient as UserProfile, lastMessage: undefined, isUnread: false });
        fetchThreads();
      }
    };
    fetchOrCreateThread();
  }, [targetUserId, user, recipientProfile]);

  async function fetchThreads() {
    if (!user) return;
    const { data: participantRows, error: pError } = await supabase.from('chat_participants').select('thread_id').eq('user_id', user.id);
    if (pError) console.error('Error fetching chat_participants:', pError);

    const threadIds = (participantRows as { thread_id: string }[] | undefined)?.map(row => row.thread_id) || [];
    if (threadIds.length === 0) {
      setThreads([]);
      return;
    }

    const { data: threadRows, error: tError } = await supabase.from('chat_threads').select('id, type, created_at, title').in('id', threadIds).order('created_at', { ascending: false });
    if (tError) console.error('Error fetching chat_threads:', tError);
    if (!threadRows) { setThreads([]); return; }
    const threadsWithDetails = await Promise.all((threadRows as Thread[]).map(async (thread) => {
      const { data: pRows } = await supabase.from('chat_participants').select('user_id').eq('thread_id', thread.id);
      const participantIds = (pRows as { user_id: string }[] | undefined)?.map(row => row.user_id) || [];
      const { data: profiles } = await supabase.from('profiles').select('id, name, profile_image').in('id', participantIds);
      const other = thread.type === 'dm' ? (profiles as ThreadParticipant[] | undefined)?.find((p) => p.id !== user.id) || null : null;
      const { data: lastMsgRows } = await supabase.from('chat_messages').select('id, content, created_at, sender_id').eq('thread_id', thread.id).order('created_at', { ascending: false }).limit(1);
      const lastMessage = (lastMsgRows && lastMsgRows[0]) ? lastMsgRows[0] as ThreadMessage : null;
      let isUnread = false;
      if (lastMessage) {
        const { data: statusRows } = await supabase.from('chat_message_status').select('read_at').eq('message_id', lastMessage.id).eq('user_id', user.id);
        isUnread = !((statusRows as { read_at?: string }[] | undefined)?.[0]?.read_at);
      }
      return { ...thread, participants: (profiles as ThreadParticipant[]) || [], other, lastMessage, isUnread };
    }));
    
    // Deduplicate DMs by other user ID
    const uniqueThreads: Thread[] = [];
    const seenDMs = new Set<string>();
    for (const t of threadsWithDetails) {
      if (t.type === 'dm' && t.other) {
        if (seenDMs.has(t.other.id)) continue;
        seenDMs.add(t.other.id);
      }
      uniqueThreads.push(t);
    }
    
    setThreads(uniqueThreads);
    if (targetUserId && user && targetUserId !== user.id) {
      const found = uniqueThreads.find(thread => thread.type === 'dm' && thread.other && thread.other.id === targetUserId);
      if (found) setSelectedThread(found);
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-1)' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-[var(--muted)] text-lg font-serif">{t('dm.page.signInPrompt', 'Sign in to view your messages.')}</p>
        </div>
      </div>
    );
  }

  const filteredThreads = threads.filter(thread => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (thread.type === 'dm') return thread.other?.name?.toLowerCase().includes(q);
    return thread.title?.toLowerCase().includes(q);
  });

  function Avatar({ src, name, size = 'md' }: { src?: string; name?: string; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-sm';
    if (src) return <img src={src} alt={name} className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-[var(--heritage-gold)]/20`} />;
    return (
      <div className={`${sizeClass} shrink-0 rounded-full flex items-center justify-center font-bold ring-2 ring-[var(--heritage-gold)]/20`}
        style={{ background: 'linear-gradient(135deg, var(--heritage-gold), var(--heritage-accent))', color: '#fff' }}>
        {name?.[0]?.toUpperCase() || '?'}
      </div>
    );
  }

  function GroupAvatar({ participants }: { participants: ThreadParticipant[] }) {
    return (
      <div className="flex -space-x-2 shrink-0">
        {participants.slice(0, 3).map((p, idx) => (
          <div key={p.id} style={{ zIndex: 10 - idx }}>
            <Avatar src={p.profile_image} name={p.name} size="sm" />
          </div>
        ))}
        {participants.length > 3 && (
          <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border-2 border-[var(--card)] text-white" style={{ background: 'var(--muted)', zIndex: 0 }}>
            +{participants.length - 3}
          </div>
        )}
      </div>
    );
  }

  function ThreadItem({ thread, onClick }: { thread: Thread; onClick: () => void }) {
    const isSelected = selectedThread?.id === thread.id;
    const isDM = thread.type === 'dm';
    const name = isDM ? (thread.other?.name || 'Unknown') : (thread.title || 'Group Chat');

    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left relative group"
        style={{
          background: isSelected ? 'linear-gradient(135deg, var(--heritage-gold)/15, var(--heritage-accent)/10)' : 'transparent',
          borderLeft: isSelected ? '3px solid var(--heritage-gold)' : '3px solid transparent',
        }}
      >
        {isSelected && <div className="absolute inset-0 rounded-xl opacity-5" style={{ background: 'var(--heritage-gold)' }} />}
        <div className="relative">
          {isDM ? <Avatar src={thread.other?.profile_image} name={thread.other?.name} /> : <GroupAvatar participants={thread.participants} />}
          {thread.isUnread && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--card)]" style={{ background: 'var(--heritage-gold)' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`font-semibold truncate text-sm ${isSelected ? 'text-[var(--heritage-gold)]' : 'text-[var(--text)]'}`}>{name}</span>
            {thread.lastMessage && (
              <span className="text-[10px] text-[var(--muted)] shrink-0">
                {new Date(thread.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <p className={`text-xs truncate mt-0.5 ${thread.isUnread ? 'font-medium text-[var(--text)]' : 'text-[var(--muted)]'}`}>
            {thread.lastMessage?.content || 'No messages yet'}
          </p>
        </div>
      </button>
    );
  }

  function Sidebar() {
    return (
      <aside className="flex flex-col h-full" style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}>
        {/* Sidebar Header */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-[var(--text)]" style={{ fontFamily: 'serif' }}>{t('dm.page.messages', 'Messages')}</h1>
              <p className="text-xs text-[var(--muted)] mt-0.5">{threads.length} {t('dm.page.conversationCount', { count: threads.length, defaultValue: threads.length !== 1 ? 'conversations' : 'conversation' })}</p>
            </div>
            <button
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 text-white"
              style={{ background: 'linear-gradient(135deg, var(--heritage-gold), var(--heritage-accent))' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              {t('dm.page.newGroup', 'New Group')}
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder={t('dm.page.searchConversations', 'Search conversations...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm font-medium text-[var(--text)]">{t('dm.page.noConversations', 'No conversations yet')}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{t('dm.page.startChatPrompt', 'Start a new chat or group conversation')}</p>
            </div>
          ) : (
            filteredThreads.map(thread => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                onClick={() => {
                  setSelectedThread(thread);
                  if (isMobile) setShowThreadListMobile(false);
                }}
              />
            ))
          )}
        </div>
      </aside>
    );
  }

  function EmptyState() {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: 'var(--bg-2)' }}>
        <div className="text-center max-w-xs">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(135deg, var(--heritage-gold)/20, var(--heritage-accent)/10)' }}>
            <svg className="w-12 h-12" style={{ color: 'var(--heritage-gold)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-[var(--text)] mb-2" style={{ fontFamily: 'serif' }}>{t('dm.page.selectConversation', 'Select a conversation')}</h3>
          <p className="text-sm text-[var(--muted)]">{t('dm.page.chooseConversationDesc', 'Choose from your existing conversations or start a new one')}</p>
        </div>
      </div>
    );
  }

  function GroupModal() {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
        <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'serif' }}>{t('dm.page.createGroupChatTitle', 'Create Group Chat')}</h2>
              <button onClick={() => setShowGroupModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-2)] text-[var(--muted)]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1.5 block">{t('dm.page.groupNameLabel', 'Group Name')}</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                placeholder={t('dm.page.groupNamePlaceholder', 'e.g. Art Collective')} value={groupTitle} onChange={e => setGroupTitle(e.target.value)}
                onFocus={e => { e.target.style.borderColor = 'var(--heritage-gold)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1.5 block">{t('dm.page.addParticipantsLabel', 'Add Participants')}</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-2 transition-all" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                placeholder={t('dm.page.searchPeoplePlaceholder', 'Search people...')} value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                {allUsers.filter(u => u.name && u.name.toLowerCase() !== 'sus').filter(u => !userSearch.trim() || u.name?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-[var(--bg-2)]">
                    <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: 'var(--heritage-gold)' }} checked={groupParticipants.includes(u.id)}
                      onChange={e => setGroupParticipants(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))} />
                    <Avatar src={u.profile_image} name={u.name} size="sm" />
                    <span className="text-sm font-medium text-[var(--text)]">{u.name}</span>
                  </label>
                ))}
              </div>
              {groupParticipants.length > 0 && (
                <p className="text-xs text-[var(--heritage-gold)] mt-2 font-medium">{groupParticipants.length} participant{groupParticipants.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
          </div>
          <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setShowGroupModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-[var(--bg-2)]" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>{t('common.cancel', 'Cancel')}</button>
            <button
              disabled={groupParticipants.length < 2 || !groupTitle}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: 'linear-gradient(135deg, var(--heritage-gold), var(--heritage-accent))' }}
              onClick={async () => {
                if (!user) return;
                const res = await fetch('/api/chat/thread', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantIds: [user.id, ...groupParticipants], title: groupTitle }) });
                const json = await res.json();
                if (json.threadId) { setShowGroupModal(false); setGroupParticipants([]); setGroupTitle(''); fetchThreads(); }
              }}
            >{t('dm.page.createGroupButton', 'Create Group')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen" style={{ background: 'var(--bg-1)' }}>
        {showGroupModal && <GroupModal />}
        <div className="relative flex-1 overflow-hidden">
          <div className={`absolute inset-0 transition-transform duration-300 ease-in-out ${showThreadListMobile ? 'translate-x-0' : '-translate-x-full'}`}>
            <Sidebar />
          </div>
          <div className={`absolute inset-0 transition-transform duration-300 ease-in-out ${showThreadListMobile ? 'translate-x-full' : 'translate-x-0'}`}>
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                <button onClick={() => setShowThreadListMobile(true)} className="flex items-center gap-2 text-sm font-medium text-[var(--heritage-gold)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Back
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {selectedThread ? (() => {
                  if (selectedThread.type === 'group' && typeof window !== 'undefined') (window as any).__DMCHAT_PARTICIPANTS = selectedThread.participants || [];
                  return <DMChat threadId={selectedThread.id} {...(selectedThread.type === 'group' ? { otherUser: { threadTitle: selectedThread.title || '', threadType: selectedThread.type } } : { otherUser: selectedThread.other as UserProfile })} />;
                })() : <EmptyState />}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-70px)]" style={{ background: 'var(--bg-1)' }}>
      {showGroupModal && <GroupModal />}
      {/* Sidebar */}
      <div className="w-80 shrink-0 flex flex-col h-full">
        <Sidebar />
      </div>
      {/* Chat Area */}
      <div className="flex-1 overflow-hidden h-full">
        {selectedThread ? (() => {
          if (selectedThread.type === 'group' && typeof window !== 'undefined') (window as any).__DMCHAT_PARTICIPANTS = selectedThread.participants || [];
          return <DMChat threadId={selectedThread.id} {...(selectedThread.type === 'group' ? { otherUser: { threadTitle: selectedThread.title || '', threadType: selectedThread.type } } : { otherUser: selectedThread.other as UserProfile })} />;
        })() : <EmptyState />}
      </div>
    </div>
  );
}

export default function DMPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-1)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--heritage-gold)', borderTopColor: 'transparent' }} />
          <p className="text-sm text-[var(--muted)]">{t('dm.page.loadingMessages', 'Loading messages...')}</p>
        </div>
      </div>
    }>
      <DMPageContent />
    </Suspense>
  );
}
