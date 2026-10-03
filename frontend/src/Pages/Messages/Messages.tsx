import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import type { ApiConversation, ApiMessage } from "../../lib/api";
import "./Messages.css";

export function Messages() {
  const { currentUser } = useAuth();
  const { userId } = useParams<{ userId?: string }>();

  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    userId ? Number(userId) : null,
  );
  const [messageContent, setMessageContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!currentUser) return;

    try {
      const result = await api.getConversationList();
      setConversations(result.conversations);
      setError(null);
    } catch {
      setError("Failed to load conversations");
    }
  }, [currentUser]);

  const loadMessages = useCallback(async () => {
    if (!currentUser || !selectedUserId) return;

    try {
      const result = await api.getConversation(selectedUserId);
      setMessages(result.messages.reverse());
      setError(null);
    } catch {
      setError("Failed to load messages");
    }
  }, [currentUser, selectedUserId]);

  useEffect(() => {
    if (!currentUser) return;

    const initialFetch = setTimeout(() => {
      void loadConversations();
    }, 0);

    const interval = setInterval(() => {
      void loadConversations();
    }, 3000);

    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [currentUser, loadConversations]);

  useEffect(() => {
    if (!currentUser || !selectedUserId) return;

    const initialFetch = setTimeout(() => {
      void loadMessages();
    }, 0);

    const interval = setInterval(() => {
      void loadMessages();
    }, 2000);

    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [currentUser, selectedUserId, loadMessages]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedUserId) return;

    try {
      const response = await api.sendMessage({
        recipientUserId: selectedUserId,
        content: messageContent,
      });
      setMessages((prev) => [...prev, response.message]);
      setMessageContent("");
      await loadConversations();
    } catch {
      setError("Failed to send message");
    }
  };

  if (!currentUser) {
    return (
      <div className="messages-empty">Please log in to view messages.</div>
    );
  }

  const selectedConversation = conversations.find(
    (c) => c.otherUserId === selectedUserId,
  );

  return (
    <div className="messages-container">
      <div className="messages-list">
        <h2>Messages</h2>
        {conversations.length === 0 ? (
          <div className="messages-empty-list">No conversations yet</div>
        ) : (
          <div className="conversations-list">
            {conversations.map((conv) => (
              <div
                key={conv.otherUserId}
                className={`conversation-item ${
                  selectedUserId === conv.otherUserId ? "active" : ""
                }`}
                onClick={() => setSelectedUserId(conv.otherUserId)}
              >
                {conv.otherUserAvatarUrl && (
                  <img
                    src={conv.otherUserAvatarUrl}
                    alt={conv.otherUserDisplayName}
                    className="conversation-avatar"
                  />
                )}
                <div className="conversation-info">
                  <div className="conversation-name">
                    {conv.otherUserDisplayName}
                  </div>
                  <div className="conversation-preview">
                    {conv.latestMessageSenderId === currentUser.id
                      ? "You: "
                      : ""}
                    {conv.latestMessageContent}
                  </div>
                  <div className="conversation-time">
                    {new Date(conv.latestMessageCreatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="messages-chat">
        {selectedUserId ? (
          <>
            <div className="messages-header">
              {selectedConversation ? (
                <Link
                  className="messages-header-link"
                  to={`/profile/${encodeURIComponent(selectedConversation.otherUserUsername)}`}
                >
                  {selectedConversation.otherUserDisplayName}
                </Link>
              ) : (
                "Loading..."
              )}
            </div>
            {error && <div className="messages-error">{error}</div>}
            <div className="messages-content" ref={messageListRef}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${
                    msg.senderUserId === currentUser.id ? "sent" : "received"
                  }`}
                >
                  <div className="message-text">{msg.content}</div>
                  <div className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
            <form className="messages-input" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type a message..."
                aria-label="Type a message"
                className="message-input-field"
              />
              <button
                type="submit"
                className="message-send-button"
                disabled={!messageContent.trim()}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="messages-empty">Select a conversation to start</div>
        )}
      </div>
    </div>
  );
}
