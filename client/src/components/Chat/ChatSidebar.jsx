import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandMark from '../BrandMark'
import { authService } from '../../services/authService'
import {
  IconClose,
  IconMenu,
  IconMoon,
  IconLinkShare,
  IconPlus,
  IconSearch,
  IconSun,
  IconUsers,
} from '../icons/MessageIcons'
import { CreateGroupModal } from './CreateGroupModal'
import { ShareLinkModal } from './ShareLinkModal'
import { SettingsModal } from '../Settings/SettingsModal'
import { UserAvatar } from '../UserAvatar'

export function ChatSidebar({
  darkMode = true,
  onToggleDarkMode,
  mobileView,
  setMobileView,
  searchUserId,
  setSearchUserId,
  handleAddFriend,
  addContactInputRef,
  pendingRequests,
  handleAcceptFriend,
  sentRequests,
  acceptedFriends,
  selectedFriend,
  setSelectedFriend,
  groups = [],
  selectedGroup,
  onSelectGroup,
  onCreateGroup,
  creatingGroup = false,
  unreadCounts = {},
  focusAddFriendInput,
  currentUser,
  userProfile,
  onProfileUpdated,
  onFriendsRefresh,
  wsRef,
  shareLinkCode,
  shareLinkWaiting,
  shareLinkPeer,
  onShareLinkEnd,
  linkSession,
  onOpenLinkSession,
}) {
  const [filter, setFilter] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showShareLink, setShowShareLink] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()

  const filteredFriends = useMemo(
    () => acceptedFriends.filter((friend) => friend.friendUserId.toLowerCase().includes(filter.toLowerCase())),
    [acceptedFriends, filter],
  )

  const filteredGroups = useMemo(
    () => groups.filter((group) => group.name.toLowerCase().includes(filter.toLowerCase())),
    [groups, filter],
  )

  const pick = (friend) => {
    setSelectedFriend(friend)
    setMobileView('chat')
  }

  const logout = () => {
    authService.logout()
    window.dispatchEvent(new Event('auth-change'))
    navigate('/login')
    setMenuOpen(false)
  }

  return (
    <aside
      className={`relative flex h-full min-h-0 w-full shrink-0 flex-col border-r border-chat-border bg-chat-sidebar dark:border-chat-borderDark dark:bg-chat-sidebarDark md:w-[min(100%,380px)] md:max-w-[380px] ${
        mobileView === 'sidebar' ? 'flex' : 'hidden md:flex'
      }`}
    >
      <header className="flex h-[59px] shrink-0 items-center justify-between gap-2 bg-chat-header px-3 dark:bg-chat-headerDark sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar userId={currentUser?.userId} avatarUrl={userProfile?.avatarUrl} online />
          <div className="min-w-0 hidden sm:block">
            <p className="truncate text-[15px] font-medium text-[#111b21] dark:text-[#e9edef]">{currentUser?.userId}</p>
            <p className="text-xs text-chat-muted dark:text-chat-mutedDark">Your chats</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="icon-btn"
            aria-label="New group"
            onClick={() => setShowCreateGroup(true)}
          >
            <IconUsers className="h-[20px] w-[20px]" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Share link for P2P files"
            onClick={() => {
              setShowShareLink(true)
              if (linkSession) onOpenLinkSession?.()
            }}
          >
            <IconLinkShare className="h-[20px] w-[20px]" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="New contact"
            onClick={() => {
              setShowAddContact(true)
              focusAddFriendInput?.()
            }}
          >
            <IconPlus className="h-[22px] w-[22px]" />
          </button>
          <button type="button" className="icon-btn" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
            <IconMenu />
          </button>
        </div>
      </header>

      <div className="shrink-0 px-3 pb-2 pt-2">
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-chat-muted dark:text-chat-mutedDark">
            <IconSearch className="h-[18px] w-[18px]" />
          </span>
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search or start new chat"
            className="field-control !rounded-lg !py-2 !pl-10 !text-[15px]"
          />
        </label>
      </div>

      {(showAddContact || searchUserId) && (
        <form
          onSubmit={(e) => {
            handleAddFriend(e)
            setShowAddContact(false)
          }}
          className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-chat-border bg-chat-header p-1.5 dark:border-chat-borderDark dark:bg-chat-headerDark"
        >
          <input
            ref={addContactInputRef}
            type="text"
            required
            value={searchUserId}
            onChange={(event) => setSearchUserId(event.target.value)}
            placeholder="Peer username"
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[#111b21] outline-none placeholder:text-chat-muted dark:text-[#e9edef] dark:placeholder:text-chat-mutedDark"
          />
          <button type="submit" className="primary-action !rounded-md !px-3 !py-2 !text-xs">
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddContact(false)
              setSearchUserId('')
            }}
            className="icon-btn !h-8 !w-8"
            aria-label="Close"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </form>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {pendingRequests.length > 0 && (
          <section className="px-2 pb-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-chat-accent dark:text-chat-accentLight">
              Friend requests
            </p>
            {pendingRequests.map((request) => (
              <div
                key={request.friendshipId}
                className="mx-1 mb-1 flex items-center justify-between rounded-lg bg-chat-accent/10 px-3 py-2.5 dark:bg-chat-accent/15"
              >
                <span className="truncate text-sm font-medium text-[#111b21] dark:text-[#e9edef]">@{request.friendUserId}</span>
                <button
                  type="button"
                  onClick={() => handleAcceptFriend(request.friendshipId)}
                  className="shrink-0 rounded-md bg-chat-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-chat-accentHover"
                >
                  Accept
                </button>
              </div>
            ))}
          </section>
        )}

        {sentRequests.length > 0 && (
          <section className="px-2 pb-1">
            <p className="px-3 py-2 text-xs font-semibold text-chat-muted dark:text-chat-mutedDark">Waiting for reply</p>
            {sentRequests.map((request) => (
              <div key={request.friendshipId} className="px-3 py-2 text-sm text-chat-muted dark:text-chat-mutedDark">
                @{request.friendUserId}
                <span className="float-right text-xs">Pending</span>
              </div>
            ))}
          </section>
        )}

        {filteredGroups.length > 0 && (
          <section className="px-2 pb-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-chat-muted dark:text-chat-mutedDark">
              Groups
            </p>
            {filteredGroups.map((group) => {
              const active = selectedGroup?.id === group.id
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => onSelectGroup?.(group)}
                  className={`chat-list-row ${active ? 'chat-list-row-active' : ''}`}
                >
                  <div className="grid h-[49px] w-[49px] shrink-0 place-items-center rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                    <IconUsers className="h-6 w-6" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <b className="truncate text-[17px] font-normal text-[#111b21] dark:text-[#e9edef]">{group.name}</b>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-chat-muted dark:text-chat-mutedDark">
                      {group.members?.length || 0} members
                    </span>
                  </span>
                </button>
              )
            })}
          </section>
        )}

        {filteredFriends.length ? (
          filteredFriends.map((friend) => {
            const active = selectedFriend?.friendId === friend.friendId
            const unread = unreadCounts[friend.friendUserId.toLowerCase()]

            return (
              <button
                key={friend.friendshipId}
                type="button"
                onClick={() => pick(friend)}
                className={`chat-list-row ${active ? 'chat-list-row-active' : ''}`}
              >
                <UserAvatar userId={friend.friendUserId} avatarUrl={friend.friendAvatarUrl} online={friend.isOnline} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <b className="truncate text-[17px] font-normal text-[#111b21] dark:text-[#e9edef]">{friend.friendUserId}</b>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-chat-muted dark:text-chat-mutedDark">
                    {friend.isOnline ? 'online' : 'last seen recently'}
                  </span>
                </span>
                {unread ? (
                  <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-ps-brand px-1.5 text-xs font-semibold text-white">
                    {unread}
                  </span>
                ) : null}
              </button>
            )
          })
        ) : (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <BrandMark className="mb-4 h-14 w-14" />
            <h3 className="text-lg font-medium text-[#111b21] dark:text-[#e9edef]">No conversations yet</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-chat-muted dark:text-chat-mutedDark">
              Add someone by username to start a private, peer-to-peer chat.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowAddContact(true)
                focusAddFriendInput?.()
              }}
              className="primary-action mt-6"
            >
              Add contact
            </button>
          </div>
        )}
      </div>

      <CreateGroupModal
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        acceptedFriends={acceptedFriends}
        creating={creatingGroup}
        onCreate={async (name, members) => {
          const ok = await onCreateGroup?.(name, members)
          if (ok) setShowCreateGroup(false)
        }}
      />

      <ShareLinkModal
        open={showShareLink}
        onClose={() => setShowShareLink(false)}
        wsRef={wsRef}
        linkCode={shareLinkCode}
        waiting={shareLinkWaiting}
        connectedPeer={shareLinkPeer || linkSession?.peerUserId}
        onEndLink={onShareLinkEnd}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onProfileUpdated={(user) => {
          onProfileUpdated?.(user)
          onFriendsRefresh?.()
        }}
      />

      {menuOpen && (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-black/40 md:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-[52px] z-50 w-56 overflow-hidden rounded-lg border border-chat-border bg-chat-sidebar shadow-xl dark:border-chat-borderDark dark:bg-chat-headerDark">
            <div className="border-b border-chat-border px-4 py-3 dark:border-chat-borderDark">
              <p className="text-xs text-chat-muted dark:text-chat-mutedDark">PeerShare</p>
              <p className="truncate text-sm font-medium">@{currentUser?.userId}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setShowSettings(true)
              }}
              className="block w-full px-4 py-3 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              Settings
            </button>
            <Link to="/how-it-works" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
              How it works
            </Link>
            <Link to="/about" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
              About
            </Link>
            <button
              type="button"
              onClick={() => onToggleDarkMode?.()}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              {darkMode ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
              {darkMode ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full border-t border-chat-border px-4 py-3 text-left text-sm font-semibold text-chat-danger hover:bg-chat-danger/5 dark:border-chat-borderDark"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
