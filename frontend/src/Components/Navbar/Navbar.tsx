import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api, type ApiHive, type ApiNotification } from "../../lib/api";
import "./Navbar.css";

function formatNotificationMessage(notification: ApiNotification): string {
  const actorText =
    notification.actorUsernames.length === 1
      ? `@${notification.actorUsernames[0]}`
      : `@${notification.actorUsernames[0]} and ${notification.count - 1} others`;

  switch (notification.type) {
    case "post_like":
      return `${actorText} liked your post.`;
    case "post_comment":
      return `${actorText} commented on your post.`;
    case "post_reply":
      return `${actorText} replied in your post.`;
    case "comment_like":
      return `${actorText} liked your comment.`;
    case "comment_reply":
      return `${actorText} replied to your comment.`;
    case "hive_follow":
      return `${actorText} followed your hive.`;
    case "hive_follow_accepted":
      return `${actorText} accepted your request to follow their hive.`;
    case "follow_request":
      return `${actorText} requested to follow you.`;
    case "follow_request_accepted":
      return `${actorText} accepted your follow request.`;
    default:
      return `${actorText} sent you a notification.`;
  }
}

function resolveNotificationTarget(notification: ApiNotification): string {
  if (notification.type === "follow_request_accepted") {
    return `/profile/${encodeURIComponent(notification.actorUsernames[0])}`;
  }

  if (notification.hiveId) {
    return `/hive/${notification.hiveId}`;
  }

  if (notification.postId && notification.commentId) {
    return `/posts/${notification.postId}#comment-${notification.commentId}`;
  }

  if (notification.postId) {
    return `/posts/${notification.postId}`;
  }

  return "/profile";
}

function Navbar() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{
    searches: string[];
    hives: ApiHive[];
  }>({ searches: [], hives: [] });
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);
  const [notificationsLoading, setNotificationsLoading] =
    useState<boolean>(false);
  const searchContainerRef = useRef<HTMLFormElement>(null);
  const notificationsContainerRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        notificationsOpen &&
        notificationsContainerRef.current &&
        !notificationsContainerRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    // once the dropdown closes, drop the unread highlight from any notification shown while it was open
    if (notificationsOpen) {
      return;
    }
    setNotifications((current) =>
      current.every((notification) => notification.read)
        ? current
        : current.map((notification) => ({ ...notification, read: true })),
    );
  }, [notificationsOpen]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults({ searches: [], hives: [] });
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await api.search(query);
        if (!cancelled) {
          setSearchResults(response);
        }
      } catch {
        if (!cancelled) {
          setSearchResults({ searches: [], hives: [] });
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    async function loadNotifications(): Promise<void> {
      if (!currentUser) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      try {
        setNotificationsLoading(true);
        const response = await api.getNotifications();
        setNotifications(response.notifications);
        setUnreadCount(response.unreadCount);
      } catch {
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setNotificationsLoading(false);
      }
    }

    void loadNotifications();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadMessageCount(0);
      return;
    }

    async function pollUnreadMessages(): Promise<void> {
      try {
        const response = await api.getUnreadMessageCount();
        setUnreadMessageCount(response.unreadCount);
      } catch {
        // ignore polling errors
      }
    }

    function refreshWhenVisible(): void {
      if (document.visibilityState === "visible") {
        void pollUnreadMessages();
      }
    }

    void pollUnreadMessages();
    const interval = setInterval(() => {
      void refreshWhenVisible();
    }, 15000);

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [currentUser]);

  const trimmedQuery = searchQuery.trim();
  const showSearchDropdown = searchOpen && trimmedQuery.length > 0;

  function clearSearch(): void {
    setSearchQuery("");
    setSearchResults({ searches: [], hives: [] });
    setSearchOpen(false);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      navigate("/search");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
  }

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/");
  }

  async function handleToggleNotifications(): Promise<void> {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (!nextOpen || !currentUser) {
      return;
    }

    try {
      setNotificationsLoading(true);
      const response = await api.getNotifications();
      // keep the fetched read flags so unread items stay highlighted while the dropdown is open
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);

      if (response.unreadCount > 0) {
        await api.markNotificationsRead();
        setUnreadCount(0);
      }
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }

  return (
    <nav>
      <Link className="brand-link" to="/">
        <h1>Hive</h1>
      </Link>
      <form
        className="nav-search"
        onSubmit={handleSearch}
        ref={searchContainerRef}
      >
        <div className="nav-search-field">
          <input
            type="search"
            placeholder="Search Hive"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              setSearchOpen(true);
            }}
            aria-label="Search Hive"
          />
          {searchQuery ? (
            <button
              type="button"
              className="nav-search-clear"
              aria-label="Clear search"
              onClick={clearSearch}
            >
              ×
            </button>
          ) : null}
        </div>
        <button type="submit" className="nav-search-submit">
          Search
        </button>
        {showSearchDropdown ? (
          <div className="nav-search-dropdown">
            <section className="nav-search-dropdown-section">
              <h2>Search</h2>
              {searchLoading ? (
                <p className="nav-search-state">Searching...</p>
              ) : null}
              {!searchLoading && searchResults.searches.length === 0 ? (
                <p className="nav-search-state">No search suggestions.</p>
              ) : null}
              <div className="nav-search-results-list">
                {searchResults.searches
                  .slice(0, 5)
                  .map((suggestion: string) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="nav-search-result"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        navigate(`/search?q=${encodeURIComponent(suggestion)}`);
                        clearSearch();
                      }}
                    >
                      <span className="nav-search-icon">⌕</span>
                      <span>{suggestion}</span>
                    </button>
                  ))}
              </div>
            </section>

            <section className="nav-search-dropdown-section">
              <h2>Communities</h2>
              {!searchLoading && searchResults.hives.length === 0 ? (
                <p className="nav-search-state">No matching communities yet.</p>
              ) : null}
              <div className="nav-search-results-list">
                {searchResults.hives.slice(0, 5).map((hive: ApiHive) => (
                  <Link
                    key={hive.id}
                    className="nav-search-result nav-search-community"
                    to={`/hive/${hive.id}`}
                    onClick={() => {
                      clearSearch();
                    }}
                  >
                    <span>
                      <strong>{hive.name}</strong>
                      <small>{hive.description}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </form>
      <div className="nav-right">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          {currentUser ? (
            <li>
              <Link to="/create">Create Hive</Link>
            </li>
          ) : null}
          {currentUser ? (
            <li
              className="nav-notifications-item"
              ref={notificationsContainerRef}
            >
              <button
                type="button"
                className="nav-bell-button"
                aria-label="Notifications"
                onClick={() => {
                  void handleToggleNotifications();
                }}
              >
                <span aria-hidden="true">🔔</span>
                {unreadCount > 0 ? (
                  <span className="nav-bell-badge">{unreadCount}</span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="nav-notifications-dropdown">
                  <h2>Notifications</h2>
                  {notificationsLoading ? (
                    <p className="nav-search-state">Loading...</p>
                  ) : null}
                  {!notificationsLoading && notifications.length === 0 ? (
                    <p className="nav-search-state">No notifications yet.</p>
                  ) : null}
                  <div className="nav-search-results-list">
                    {notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        className={`nav-search-result nav-notification-link${
                          notification.read
                            ? ""
                            : " nav-notification-link--unread"
                        }`}
                        to={resolveNotificationTarget(notification)}
                        onClick={() => {
                          setNotificationsOpen(false);
                        }}
                      >
                        <span>
                          <strong>
                            {formatNotificationMessage(notification)}
                          </strong>
                          <small>
                            {new Date(notification.createdAt).toLocaleString()}
                          </small>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          ) : null}
          {currentUser ? (
            <li className="nav-messages-item">
              <Link to="/messages" className="nav-messages-link">
                Messages
                {unreadMessageCount > 0 ? (
                  <span
                    className="nav-messages-dot"
                    aria-label={`${unreadMessageCount} unread messages`}
                  />
                ) : null}
              </Link>
            </li>
          ) : null}
          {currentUser ? (
            <li>
              <Link to="/profile">Profile</Link>
            </li>
          ) : null}
        </ul>
        <div className="auth-controls">
          {currentUser ? (
            <>
              <span>@{currentUser.username}</span>
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <div className="auth-links">
              <Link className="login-link" to="/login">
                Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
export default Navbar;
