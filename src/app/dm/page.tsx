// Desktop UI and layout is preserved by the conditional rendering above. No further code changes needed for this step.
"use client"
import DMChat from '@/components/DMChat';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

// Utility hook for mobile detection
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < breakpoint);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);
  return isMobile;
}

function DMPageContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Group chat creation modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  type UserProfile = { id: string; name: string; profile_image?: string };
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  type ThreadType = 'dm' | 'group';
  type ThreadParticipant = UserProfile;
  type ThreadMessage = {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
  };
  type Thread = {
    id: string;
    type: ThreadType;
    created_at: string;
    title?: string;
    participants: ThreadParticipant[];
    other?: ThreadParticipant | null;
    lastMessage?: ThreadMessage | null;
    isUnread: boolean;
  };
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const searchParams = useSearchParams();
  const targetUserId = searchParams?.get('userId');
  const [recipientProfile, setRecipientProfile] = useState<{ id: string; name: string; profile_image?: string } | null>(null);
  // State for user search/filter in group modal
  const [userSearch, setUserSearch] = useState('');
  // Responsive state
  const isMobile = useIsMobile();
  const [showThreadListMobile, setShowThreadListMobile] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchThreads();

    // Supabase real-time subscription for new messages in any thread
    const channel = supabase.channel('dm_sidebar')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        fetchThreads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch recipient profile if userId is present
  useEffect(() => {
    async function fetchRecipient() {
      if (!targetUserId) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, profile_image')
        .eq('id', targetUserId)
        .single();
      if (data) setRecipientProfile(data);
    }
    if (targetUserId) fetchRecipient();
  }, [targetUserId]);

  // Fetch all users for group selection
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('id, name, profile_image')
      .then(({ data }) => {
        setAllUsers((data as UserProfile[] || []).filter((u) => u.id !== user.id));
      });
  }, [user]);

  useEffect(() => {
    if (!user || !targetUserId || targetUserId === user.id) return;
    // Only POST to /api/chat/thread once when user and targetUserId are set
    const fetchOrCreateThread = async () => {
      const res = await fetch('/api/chat/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: [user.id, targetUserId] })
      });
      const json = await res.json();
      let recipient = recipientProfile;
      if (!recipient) {
        // Fetch recipient profile if not already loaded
        const { data } = await supabase
          .from('profiles')
          .select('id, name, profile_image')
          .eq('id', targetUserId)
          .single();
        recipient = data || { id: targetUserId, name: 'User' };
      }
      if (json.threadId) {
        setSelectedThread({
          id: json.threadId,
          type: 'dm',
          created_at: new Date().toISOString(),
          participants: [user as UserProfile, recipient as UserProfile],
          other: recipient as UserProfile,
          lastMessage: undefined,
          isUnread: false,
        });
      }
    };
    fetchOrCreateThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, user, recipientProfile]);

  async function fetchThreads() {
    if (!user) return;
    // Fetch all threads (DM and group) for the current user
    const { data: participantRows } = await supabase
      .from('chat_participants')
      .select('thread_id')
      .eq('user_id', user.id);
    const threadIds = (participantRows as { thread_id: string }[] | undefined)?.map(row => row.thread_id) || [];
    const { data: threadRows, error: threadError } = await supabase
      .from('chat_threads')
      .select('id, type, created_at, title')
      .in('id', threadIds)
      .order('created_at', { ascending: false });

    if (!threadRows) {
      setThreads([]);
      return;
    }

    // For each thread, fetch participants and last message
    const threadsWithDetails = await Promise.all((threadRows as Thread[]).map(async (thread) => {
      // Fetch participants
      const { data: participantRows } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('thread_id', thread.id);
      const participantIds = (participantRows as { user_id: string }[] | undefined)?.map(row => row.user_id) || [];
      // Fetch profiles for participants
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, profile_image')
        .in('id', participantIds);
      // For DM, find the other participant
      const other = thread.type === 'dm' ? (profiles as ThreadParticipant[] | undefined)?.find((p) => p.id !== user.id) || null : null;
      // Fetch last message
      const { data: lastMsgRows } = await supabase
        .from('chat_messages')
        .select('id, content, created_at, sender_id')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(1);
      const lastMessage = (lastMsgRows && lastMsgRows[0]) ? lastMsgRows[0] as ThreadMessage : null;
      // Unread indicator: check if last message is unread for current user
      let isUnread = false;
      if (lastMessage) {
        const { data: statusRows } = await supabase
          .from('chat_message_status')
          .select('read_at')
          .eq('message_id', lastMessage.id)
          .eq('user_id', user.id);
        isUnread = !((statusRows as { read_at?: string }[] | undefined)?.[0]?.read_at);
      }
      return {
        ...thread,
        participants: (profiles as ThreadParticipant[]) || [],
        other,
        lastMessage,
        isUnread,
      };
    }));
    setThreads(threadsWithDetails);
    // Auto-select thread for target user if present (DM only)
    if (targetUserId && user && targetUserId !== user.id) {
      const found = threadsWithDetails.find(thread =>
        thread.type === 'dm' && thread.other && thread.other.id === targetUserId
      );
      if (found) setSelectedThread(found);
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center h-screen text-[var(--muted)] text-xl font-serif">Sign in to view your messages.</div>;
  }

  // Responsive rendering
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-full bg-[var(--bg-1)]">
        <div className="p-4 flex gap-2 items-center border-b border-[var(--border)] bg-[var(--card)] shadow-sm">
          <button
            className="btn-primary"
            onClick={() => setShowGroupModal(true)}
          >
            {t('dm.newGroupChat')}
          </button>
        </div>
        {showGroupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm w-screen h-screen overflow-y-auto">
            <div className="bg-[var(--card)] rounded-2xl shadow-xl p-6 w-full max-w-sm mx-auto border border-[var(--border)]" style={{ minHeight: 'auto', maxHeight: '95vh', overflowY: 'auto' }}>
              <h3 className="text-2xl font-serif font-bold mb-4 text-[var(--text)]">{t('dm.createGroupChat')}</h3>
              <input
                type="text"
                className="w-full mb-3 p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-1)] text-[var(--text)] focus:ring-2 focus:ring-[var(--heritage-gold)] focus:outline-none transition-all"
                placeholder={t('dm.groupTitle')}
                value={groupTitle}
                onChange={e => setGroupTitle(e.target.value)}
              />
              {/* Search/filter input for users */}
              <input
                type="text"
                className="w-full mb-4 p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-1)] text-[var(--text)] focus:ring-2 focus:ring-[var(--heritage-gold)] focus:outline-none transition-all"
                placeholder={t('dm.searchPeople')}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
              <div className="mb-4">
                <div className="font-semibold mb-2 text-[var(--muted)]">{t('dm.addParticipants')}</div>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                  {allUsers
                    .filter(u => u.name && u.name.toLowerCase() !== 'sus')
                    .filter(u =>
                      !userSearch?.trim() ||
                      (u.name && u.name.toLowerCase().includes(userSearch.trim().toLowerCase()))
                    )
                    .map(u => (
                      <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--glass)] cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          className="accent-[var(--heritage-gold)] w-4 h-4"
                          checked={groupParticipants.includes(u.id)}
                          onChange={e => {
                            setGroupParticipants(prev =>
                              e.target.checked
                                ? [...prev, u.id]
                                : prev.filter(id => id !== u.id)
                            );
                          }}
                        />
                        {u.profile_image ? (
                          <img src={u.profile_image} className="w-6 h-6 rounded-full" />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{u.name?.[0] || '?'}</span>
                        )}
                        <span>{u.name}</span>
                      </label>
                    ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button className="px-5 py-2.5 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--glass)] text-[var(--text)] border border-[var(--border)] font-medium transition-all" onClick={() => setShowGroupModal(false)}>{t('dm.cancel')}</button>
                <button
                  className="btn-primary"
                  disabled={groupParticipants.length < 2 || !groupTitle}
                  onClick={async () => {
                    // Create group thread
                    const res = await fetch('/api/chat/thread', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ participantIds: [user.id, ...groupParticipants], title: groupTitle })
                    });
                    const json = await res.json();
                    if (json.threadId) {
                      setShowGroupModal(false);
                      setGroupParticipants([]);
                      setGroupTitle('');
                      fetchThreads();
                    }
                  }}
                >{t('dm.create')}</button>
              </div>
            </div>
          </div>
        )}
        {/* Thread list (mobile) */}
        <div className="relative flex-1 w-full h-full">
          <div
            className={`absolute inset-0 transition-transform duration-300 ease-in-out ${showThreadListMobile ? 'translate-x-0 z-10' : '-translate-x-full z-0'} bg-[var(--bg-1)]`}
            style={{ minHeight: '100%', minWidth: '100%' }}
          >
            <aside className="w-full border-b border-[var(--border)] bg-[var(--bg-1)] p-4 flex-1">
              <h2 className="font-serif font-bold text-2xl mb-6 text-[var(--text)]">{t('dm.chats')}</h2>
              {threads.length === 0 ? (
                <div className="text-[var(--muted)] italic">{t('dm.noChats')}</div>
              ) : (
                threads.map(thread => {
                  if (thread.type === 'dm') {
                    const other = thread.other;
                    return (
                      <button
                        key={thread.id}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl mb-2 hover:bg-[var(--glass)] hover:scale-[1.02] transition-all duration-300 border ${selectedThread?.id === thread.id ? 'border-[var(--heritage-gold)] bg-[var(--heritage-gold)]/10 shadow-sm' : 'border-transparent'}`}
                        onClick={() => {
                          setSelectedThread(thread);
                          setShowThreadListMobile(false);
                        }}
                      >
                        {/* Profile image */}
                        {other && other.profile_image ? (
                          <img src={other.profile_image} alt={other.name || 'User'} className="w-12 h-12 rounded-full object-cover border border-gray-300" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500 border border-gray-300">{other?.name?.[0] || '?'}</div>
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-base">{other?.name || t('dm.unknownUser')}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[180px]">{thread.lastMessage?.content || t('dm.noMessages')}</div>
                        </div>
                        {/* Unread dot */}
                        {thread.isUnread && (
                          <span className="w-3 h-3 rounded-full bg-blue-500 ml-2" />
                        )}
                      </button>
                    );
                  } else {
                    // Group thread
                    return (
                      <button
                        key={thread.id}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 hover:bg-gray-100 transition-all border ${selectedThread?.id === thread.id ? 'border-heritage-gold bg-heritage-gold/10' : 'border-transparent'}`}
                        onClick={() => {
                          setSelectedThread(thread);
                          setShowThreadListMobile(false);
                        }}
                      >
                        {/* Group avatars */}
                        <div className="flex -space-x-2">
                          {thread.participants.slice(0, 3).map((p: ThreadParticipant) => (
                            p.profile_image ? (
                              <img key={p.id} src={p.profile_image} alt={p.name} className="w-10 h-10 rounded-full border-2 border-white" />
                            ) : (
                              <span key={p.id} className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-base font-bold border-2 border-white">{p.name?.[0] || '?'}</span>
                            )
                          ))}
                          {thread.participants.length > 3 && (
                            <span className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold border-2 border-white">+{thread.participants.length - 3}</span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-base">{thread.title || t('dm.groupChat')}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[180px]">{thread.lastMessage?.content || t('dm.noMessages')}</div>
                        </div>
                        {/* Unread dot */}
                        {thread.isUnread && (
                          <span className="w-3 h-3 rounded-full bg-blue-500 ml-2" />
                        )}
                      </button>
                    );
                  }
                })
              )}
            </aside>
          </div>
          <div
            className={`absolute inset-0 transition-transform duration-300 ease-in-out ${showThreadListMobile ? 'translate-x-full z-0' : 'translate-x-0 z-10'} bg-[var(--bg-2)]`}
            style={{ minHeight: '100%', minWidth: '100%' }}
          >
            <main className="flex-1 flex flex-col items-center justify-center w-full h-full">
              <button
                className="self-start m-4 px-4 py-2 rounded-xl bg-[var(--card)] text-[var(--text)] border border-[var(--border)] font-medium shadow-sm hover:bg-[var(--glass)] transition-all flex items-center gap-2"
                onClick={() => setShowThreadListMobile(true)}
              >
                {t('dm.backToChats')}
              </button>
              {selectedThread ? (
                (() => {
                  if (selectedThread.type === 'group' && typeof window !== 'undefined') {
                    (window as unknown as { __DMCHAT_PARTICIPANTS?: ThreadParticipant[] }).__DMCHAT_PARTICIPANTS = selectedThread.participants || [];
                  }
                  return (
                    <DMChat
                      threadId={selectedThread.id}
                      {...(
                        selectedThread.type === 'group'
                          ? { otherUser: { threadTitle: selectedThread.title || '', threadType: selectedThread.type } }
                          : { otherUser: selectedThread.other as UserProfile }
                      )}
                    />
                  );
                })()
              ) : (
                <div className="text-[var(--muted)] text-xl font-serif">Select a chat to start messaging.</div>
              )}
            </main>
          </div>
        </div>
      </div>
    );
  }

  // Desktop UI
  return (
    <div className="flex h-[calc(100vh-80px)] mt-4 mb-4 mx-4 rounded-2xl overflow-hidden border border-[var(--border)] shadow-medium bg-[var(--bg-1)]">
      {/* Thread list */}
      <aside className="w-80 border-r border-[var(--border)] bg-[var(--card)] p-4 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
          <h2 className="font-serif font-bold text-2xl text-[var(--text)]">{t('dm.chats')}</h2>
          <button
            className="btn-primary py-1.5 px-4 text-sm"
            onClick={() => setShowGroupModal(true)}
          >
            {t('dm.newGroupChat')}
          </button>
        </div>
        {showGroupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-[var(--card)] rounded-2xl shadow-xl p-6 w-full max-w-md border border-[var(--border)]">
              <h3 className="text-2xl font-serif font-bold mb-4 text-[var(--text)]">{t('dm.createGroupChat')}</h3>
              <input
                type="text"
                className="w-full mb-3 p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-1)] text-[var(--text)] focus:ring-2 focus:ring-[var(--heritage-gold)] focus:outline-none transition-all"
                placeholder={t('dm.groupTitle')}
                value={groupTitle}
                onChange={e => setGroupTitle(e.target.value)}
              />
              {/* Search/filter input for users (desktop) */}
              <input
                type="text"
                className="w-full mb-4 p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-1)] text-[var(--text)] focus:ring-2 focus:ring-[var(--heritage-gold)] focus:outline-none transition-all"
                placeholder={t('dm.searchPeople')}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
              <div className="mb-4">
                <div className="font-semibold mb-2 text-[var(--muted)]">{t('dm.addParticipants')}</div>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                  {allUsers
                    .filter(u => u.name && u.name.toLowerCase() !== 'sus')
                    .filter(u =>
                      !userSearch?.trim() ||
                      (u.name && u.name.toLowerCase().includes(userSearch.trim().toLowerCase()))
                    )
                    .map(u => (
                      <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--glass)] cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          className="accent-[var(--heritage-gold)] w-4 h-4"
                          checked={groupParticipants.includes(u.id)}
                          onChange={e => {
                            setGroupParticipants(prev =>
                              e.target.checked
                                ? [...prev, u.id]
                                : prev.filter(id => id !== u.id)
                            );
                          }}
                        />
                        {u.profile_image ? (
                          <img src={u.profile_image} className="w-6 h-6 rounded-full" />
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-[var(--heritage-gold)] flex items-center justify-center text-xs font-bold text-white shadow-sm">{u.name?.[0] || '?'}</span>
                        )}
                        <span className="font-medium text-[var(--text)]">{u.name}</span>
                      </label>
                    ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button className="px-5 py-2.5 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--glass)] text-[var(--text)] border border-[var(--border)] font-medium transition-all" onClick={() => setShowGroupModal(false)}>{t('dm.cancel')}</button>
                <button
                  className="btn-primary"
                  disabled={groupParticipants.length < 2 || !groupTitle}
                  onClick={async () => {
                    // Create group thread
                    const res = await fetch('/api/chat/thread', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ participantIds: [user.id, ...groupParticipants], title: groupTitle })
                    });
                    const json = await res.json();
                    if (json.threadId) {
                      setShowGroupModal(false);
                      setGroupParticipants([]);
                      setGroupTitle('');
                      fetchThreads();
                    }
                  }}
                >{t('dm.create')}</button>
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-1 pr-2">
        {threads.length === 0 ? (
          <div className="text-[var(--muted)] italic">{t('dm.noChats')}</div>
        ) : (
          threads.map(thread => {
            if (thread.type === 'dm') {
              const other = thread.other;
              return (
                <button
                  key={thread.id}
                  className={`w-full flex items-center gap-4 p-3 rounded-xl mb-1 hover:bg-[var(--glass)] hover:scale-[1.02] transition-all duration-300 border ${selectedThread?.id === thread.id ? 'border-[var(--heritage-gold)] bg-[var(--heritage-gold)]/10 shadow-sm' : 'border-transparent'}`}
                  onClick={() => setSelectedThread(thread)}
                >
                  {/* Profile image */}
                  {other && other.profile_image ? (
                    <img src={other.profile_image} alt={other.name || 'User'} className="w-12 h-12 rounded-full object-cover border border-gray-300" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-2)] flex items-center justify-center text-xl font-serif font-bold text-[var(--heritage-gold)] border border-[var(--border)] shadow-sm">{other?.name?.[0] || '?'}</div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-serif font-semibold text-lg text-[var(--text)]">{other?.name || t('dm.unknownUser')}</div>
                    <div className="text-sm text-[var(--muted)] truncate max-w-[180px]">{thread.lastMessage?.content || t('dm.noMessages')}</div>
                  </div>
                  {/* Unread dot */}
                  {thread.isUnread && (
                    <span className="w-3 h-3 rounded-full bg-blue-500 ml-2" />
                  )}
                </button>
              );
            } else {
              // Group thread
              return (
                <button
                  key={thread.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 hover:bg-gray-100 transition-all border ${selectedThread?.id === thread.id ? 'border-heritage-gold bg-heritage-gold/10' : 'border-transparent'}`}
                  onClick={() => setSelectedThread(thread)}
                >
                  {/* Group avatars */}
                  <div className="flex -space-x-2">
                    {thread.participants.slice(0, 3).map((p: ThreadParticipant) => (
                      p.profile_image ? (
                        <img key={p.id} src={p.profile_image} alt={p.name} className="w-10 h-10 rounded-full border-2 border-white" />
                      ) : (
                        <span key={p.id} className="w-10 h-10 rounded-full bg-[var(--bg-2)] text-[var(--heritage-gold)] flex items-center justify-center text-base font-bold border-2 border-[var(--bg-1)]">{p.name?.[0] || '?'}</span>
                      )
                    ))}
                    {thread.participants.length > 3 && (
                      <span className="w-10 h-10 rounded-full bg-[var(--muted)] text-white flex items-center justify-center text-xs font-bold border-2 border-[var(--bg-1)]">+{thread.participants.length - 3}</span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-serif font-semibold text-lg text-[var(--text)]">{thread.title || t('dm.groupChat')}</div>
                    <div className="text-sm text-[var(--muted)] truncate max-w-[180px]">{thread.lastMessage?.content || t('dm.noMessages')}</div>
                  </div>
                  {/* Unread dot */}
                  {thread.isUnread && (
                    <span className="w-3 h-3 rounded-full bg-blue-500 ml-2" />
                  )}
                </button>
              );
            }
          })
        )}
        </div>
      </aside>
      {/* Chat area */}
      <main className="flex-1 flex items-center justify-center bg-[var(--bg-2)] relative">
        {selectedThread ? (
          (() => {
            if (selectedThread.type === 'group' && typeof window !== 'undefined') {
              (window as unknown as { __DMCHAT_PARTICIPANTS?: ThreadParticipant[] }).__DMCHAT_PARTICIPANTS = selectedThread.participants || [];
            }
            return (
              <DMChat
                threadId={selectedThread.id}
                {...(
                  selectedThread.type === 'group'
                    ? { otherUser: { threadTitle: selectedThread.title || '', threadType: selectedThread.type } }
                    : { otherUser: selectedThread.other as UserProfile }
                )}
              />
            );
          })()
        ) : (
          <div className="text-[var(--muted)] text-2xl font-serif flex flex-col items-center opacity-60">
            <svg className="w-24 h-24 mb-6 text-[var(--border)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {t('dm.selectChatToMessage', 'Select a chat to start messaging.')}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DMPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DMPageContent />
    </Suspense>
  );
}
