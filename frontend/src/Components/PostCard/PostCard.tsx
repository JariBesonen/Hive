import { useState } from "react";
import { Link } from "react-router-dom";
import type { ApiComment, ApiPost } from "../../lib/api";
import {
  ApiError,
  api,
  resolveMediaUrl as resolveMediaSrc,
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import LoginPrompt from "../LoginPrompt/LoginPrompt";
import ConfirmToast from "../ConfirmToast/ConfirmToast";
import "./PostCard.css";

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString();
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const time = date.getTime();

  if (Number.isNaN(time)) {
    return formatDate(isoDate);
  }

  const diffInSeconds = Math.floor((Date.now() - time) / 1000);
  if (diffInSeconds < 5) {
    return "just now";
  }

  const units: Array<{ max: number; value: number; label: string }> = [
    { max: 60, value: 1, label: "second" },
    { max: 60 * 60, value: 60, label: "minute" },
    { max: 60 * 60 * 24, value: 60 * 60, label: "hour" },
    { max: 60 * 60 * 24 * 7, value: 60 * 60 * 24, label: "day" },
    { max: 60 * 60 * 24 * 30, value: 60 * 60 * 24 * 7, label: "week" },
    { max: 60 * 60 * 24 * 365, value: 60 * 60 * 24 * 30, label: "month" },
    {
      max: Number.POSITIVE_INFINITY,
      value: 60 * 60 * 24 * 365,
      label: "year",
    },
  ];

  const absSeconds = Math.abs(diffInSeconds);
  const unit =
    units.find((candidate) => absSeconds < candidate.max) || units[0];
  const amount = Math.floor(absSeconds / unit.value);
  const suffix = amount === 1 ? "" : "s";

  if (diffInSeconds >= 0) {
    return `${amount} ${unit.label}${suffix} ago`;
  }

  return `in ${amount} ${unit.label}${suffix}`;
}

export default function PostCard({
  post,
  hideComments = false,
}: {
  post: ApiPost;
  hideComments?: boolean;
}) {
  const { currentUser } = useAuth();
  const [isDeleted, setIsDeleted] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteMessage, setDeleteMessage] = useState<string>("");
  const [likeCount, setLikeCount] = useState<number>(post.likeCount || 0);
  const [dislikeCount, setDislikeCount] = useState<number>(
    post.dislikeCount || 0,
  );
  const [userVote, setUserVote] = useState<number | null>(
    post.userVote ?? null,
  );
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [voteMessage, setVoteMessage] = useState<string>("");
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState<boolean>(false);
  const [hasLoadedComments, setHasLoadedComments] = useState<boolean>(false);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState<boolean>(false);
  const [commentsMessage, setCommentsMessage] = useState<string>("");
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [isCommentSubmitting, setIsCommentSubmitting] =
    useState<boolean>(false);
  const [openReplyForId, setOpenReplyForId] = useState<number | null>(null);
  const [replyDraftByCommentId, setReplyDraftByCommentId] = useState<
    Record<number, string>
  >({});
  const [isReplySubmittingForId, setIsReplySubmittingForId] = useState<
    number | null
  >(null);
  const [isCommentVotingForId, setIsCommentVotingForId] = useState<
    number | null
  >(null);
  const [isCommentDeletingForId, setIsCommentDeletingForId] = useState<
    number | null
  >(null);
  const [isLoginPromptVisible, setIsLoginPromptVisible] =
    useState<boolean>(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string>("");
  const [commentPendingDeleteId, setCommentPendingDeleteId] = useState<
    number | null
  >(null);
  const [isPostDeleteConfirmVisible, setIsPostDeleteConfirmVisible] =
    useState<boolean>(false);

  function requireLogin(message: string): void {
    setLoginPromptMessage(message);
    setIsLoginPromptVisible(true);
  }

  const imageSrc = resolveMediaSrc(post.imageUrl);
  const shouldRenderBody =
    post.content.trim().length > 0 && post.content !== post.title;

  async function handleDelete(): Promise<void> {
    setIsPostDeleteConfirmVisible(true);
  }

  async function confirmDeletePost(): Promise<void> {
    setIsPostDeleteConfirmVisible(false);

    try {
      setIsDeleting(true);
      setDeleteMessage("");
      await api.deletePost(post.id);
      setIsDeleted(true);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setDeleteMessage(caughtError.message);
        return;
      }

      setDeleteMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete post.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleVote(nextVote: 1 | -1): Promise<void> {
    if (!currentUser) {
      requireLogin("to like or dislike posts");
      return;
    }

    try {
      setIsVoting(true);
      setVoteMessage("");

      const response =
        nextVote === 1
          ? await api.likePost(post.id)
          : await api.dislikePost(post.id);

      setLikeCount(response.post.likeCount ?? 0);
      setDislikeCount(response.post.dislikeCount ?? 0);
      setUserVote(response.post.userVote ?? null);
    } catch (caughtError) {
      setVoteMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update vote.",
      );
    } finally {
      setIsVoting(false);
    }
  }

  async function handleSaveToggle(): Promise<void> {
    if (!currentUser) {
      requireLogin("to save posts");
      return;
    }

    try {
      setIsSaving(true);
      if (isSaved) {
        await api.unsavePost(post.id);
      } else {
        await api.savePost(post.id);
      }
      setIsSaved(!isSaved);
    } catch {
      // Silently fail for now
    } finally {
      setIsSaving(false);
    }
  }

  async function loadComments(): Promise<void> {
    try {
      setIsCommentsLoading(true);
      setCommentsMessage("");
      const response = await api.getPostComments(post.id);
      setComments(response.comments);
      setHasLoadedComments(true);
    } catch (caughtError) {
      setCommentsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load comments.",
      );
    } finally {
      setIsCommentsLoading(false);
    }
  }

  function addReplyToTree(
    nodes: ApiComment[],
    parentCommentId: number,
    newReply: ApiComment,
  ): ApiComment[] {
    return nodes.map((node) => {
      if (node.id === parentCommentId) {
        return {
          ...node,
          replies: [...node.replies, newReply],
        };
      }

      if (node.replies.length === 0) {
        return node;
      }

      return {
        ...node,
        replies: addReplyToTree(node.replies, parentCommentId, newReply),
      };
    });
  }

  function markSubtreeDeleted(node: ApiComment): ApiComment {
    return {
      ...node,
      content: "[deleted]",
      isDeleted: true,
      replies: node.replies.map(markSubtreeDeleted),
    };
  }

  function updateCommentInTree(
    nodes: ApiComment[],
    targetCommentId: number,
    updater: (node: ApiComment) => ApiComment,
  ): ApiComment[] {
    return nodes.map((node) => {
      if (node.id === targetCommentId) {
        return updater(node);
      }

      if (node.replies.length === 0) {
        return node;
      }

      return {
        ...node,
        replies: updateCommentInTree(node.replies, targetCommentId, updater),
      };
    });
  }

  async function handleToggleComments(): Promise<void> {
    const nextOpen = !isCommentsOpen;
    setIsCommentsOpen(nextOpen);

    if (nextOpen && !hasLoadedComments) {
      await loadComments();
    }
  }

  async function handleCreateComment(): Promise<void> {
    if (!currentUser) {
      requireLogin("to comment");
      return;
    }

    const content = commentDraft.trim();
    if (!content) {
      setCommentsMessage("Comment content is required.");
      return;
    }

    try {
      setIsCommentSubmitting(true);
      setCommentsMessage("");
      const response = await api.createPostComment(post.id, { content });
      setComments((current) => [response.comment, ...current]);
      setCommentDraft("");
      setHasLoadedComments(true);
      setIsCommentsOpen(true);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setCommentsMessage(caughtError.message);
        return;
      }

      setCommentsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create comment.",
      );
    } finally {
      setIsCommentSubmitting(false);
    }
  }

  async function handleCreateReply(parentCommentId: number): Promise<void> {
    if (!currentUser) {
      requireLogin("to reply");
      return;
    }

    const content = (replyDraftByCommentId[parentCommentId] || "").trim();
    if (!content) {
      setCommentsMessage("Reply content is required.");
      return;
    }

    try {
      setIsReplySubmittingForId(parentCommentId);
      setCommentsMessage("");
      const response = await api.createPostComment(post.id, {
        content,
        parentCommentId,
      });
      setComments((current) =>
        addReplyToTree(current, parentCommentId, response.comment),
      );
      setReplyDraftByCommentId((current) => ({
        ...current,
        [parentCommentId]: "",
      }));
      setOpenReplyForId(null);
      setHasLoadedComments(true);
      setIsCommentsOpen(true);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setCommentsMessage(caughtError.message);
        return;
      }

      setCommentsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create reply.",
      );
    } finally {
      setIsReplySubmittingForId(null);
    }
  }

  async function handleCommentVote(
    commentId: number,
    nextVote: 1 | -1,
  ): Promise<void> {
    if (!currentUser) {
      requireLogin("to like or dislike comments");
      return;
    }

    try {
      setIsCommentVotingForId(commentId);
      setCommentsMessage("");

      const response =
        nextVote === 1
          ? await api.likeComment(post.id, commentId)
          : await api.dislikeComment(post.id, commentId);

      setComments((current) =>
        updateCommentInTree(current, commentId, (node) => ({
          ...node,
          likeCount: response.comment.likeCount,
          dislikeCount: response.comment.dislikeCount,
          userVote: response.comment.userVote,
        })),
      );
    } catch (caughtError) {
      setCommentsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update comment vote.",
      );
    } finally {
      setIsCommentVotingForId(null);
    }
  }

  async function handleDeleteComment(commentId: number): Promise<void> {
    if (!currentUser) {
      requireLogin("to delete comments");
      return;
    }

    setCommentPendingDeleteId(commentId);
  }

  async function confirmDeleteComment(): Promise<void> {
    const commentId = commentPendingDeleteId;
    setCommentPendingDeleteId(null);
    if (commentId === null) {
      return;
    }

    try {
      setIsCommentDeletingForId(commentId);
      setCommentsMessage("");
      const response = await api.deleteComment(post.id, commentId);
      setComments((current) =>
        updateCommentInTree(current, commentId, (node) => ({
          ...markSubtreeDeleted(node),
          content: response.comment.content,
          userVote: response.comment.userVote,
          likeCount: response.comment.likeCount,
          dislikeCount: response.comment.dislikeCount,
        })),
      );

      setReplyDraftByCommentId((current) => {
        const updated = { ...current };
        delete updated[commentId];
        return updated;
      });

      if (openReplyForId === commentId) {
        setOpenReplyForId(null);
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setCommentsMessage(caughtError.message);
        return;
      }

      setCommentsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete comment.",
      );
    } finally {
      setIsCommentDeletingForId(null);
    }
  }

  function renderComments(commentList: ApiComment[], depth = 0) {
    return commentList
      .filter((comment) => !comment.isDeleted)
      .map((comment) => {
        const replyDraft = replyDraftByCommentId[comment.id] || "";

        return (
          <div
            key={comment.id}
            className="post-card-comment"
            style={{ marginLeft: `${Math.min(depth, 3) * 1.05}rem` }}
          >
            <div className="post-card-comment-meta">
              <span>{`@${comment.authorUsername}`}</span>
              <div className="post-card-comment-meta-actions">
                <small>{formatRelativeTime(comment.createdAt)}</small>
                {currentUser?.id === comment.userId ? (
                  <button
                    type="button"
                    className="post-card-comment-delete-button"
                    onClick={() => {
                      void handleDeleteComment(comment.id);
                    }}
                    disabled={isCommentDeletingForId === comment.id}
                  >
                    {isCommentDeletingForId === comment.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                ) : null}
              </div>
            </div>
            <p>{comment.content}</p>

            <div className="post-card-comment-vote-row">
              <button
                type="button"
                className={`post-card-comment-vote-button ${comment.userVote === 1 ? "active" : ""}`}
                onClick={() => {
                  void handleCommentVote(comment.id, 1);
                }}
                disabled={!currentUser || isCommentVotingForId === comment.id}
                aria-pressed={comment.userVote === 1}
              >
                Like <span>{comment.likeCount}</span>
              </button>
              <button
                type="button"
                className={`post-card-comment-vote-button ${comment.userVote === -1 ? "active" : ""}`}
                onClick={() => {
                  void handleCommentVote(comment.id, -1);
                }}
                disabled={!currentUser || isCommentVotingForId === comment.id}
                aria-pressed={comment.userVote === -1}
              >
                Dislike <span>{comment.dislikeCount}</span>
              </button>
              <button
                type="button"
                className="post-card-comment-reply-button"
                onClick={() => {
                  setOpenReplyForId((current) =>
                    current === comment.id ? null : comment.id,
                  );
                }}
                disabled={!currentUser}
              >
                Reply
              </button>
            </div>

            {openReplyForId === comment.id ? (
              <div className="post-card-reply-form">
                <textarea
                  rows={2}
                  value={replyDraft}
                  placeholder="Write a reply"
                  onChange={(event) => {
                    setReplyDraftByCommentId((current) => ({
                      ...current,
                      [comment.id]: event.target.value,
                    }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleCreateReply(comment.id);
                  }}
                  disabled={isReplySubmittingForId === comment.id}
                >
                  {isReplySubmittingForId === comment.id
                    ? "Replying..."
                    : "Reply"}
                </button>
              </div>
            ) : null}

            {comment.replies.length > 0
              ? renderComments(comment.replies, depth + 1)
              : null}
          </div>
        );
      });
  }

  if (isDeleted) {
    return null;
  }

  return (
    <article className={`post-card ${!imageSrc ? "post-card-no-image" : ""}`}>
      <LoginPrompt
        isVisible={isLoginPromptVisible}
        onClose={() => setIsLoginPromptVisible(false)}
        message={loginPromptMessage}
      />
      <ConfirmToast
        isVisible={commentPendingDeleteId !== null}
        message="Delete this comment?"
        onConfirm={() => {
          void confirmDeleteComment();
        }}
        onCancel={() => setCommentPendingDeleteId(null)}
      />
      <ConfirmToast
        isVisible={isPostDeleteConfirmVisible}
        message="Delete this post?"
        onConfirm={() => {
          void confirmDeletePost();
        }}
        onCancel={() => setIsPostDeleteConfirmVisible(false)}
      />
      <header className="post-card-header">
        {post.hiveId ? (
          <Link
            to={`/hive/${post.hiveId}`}
            className="post-card-community-link"
          >
            {post.community}
          </Link>
        ) : (
          <span>{post.community}</span>
        )}
        <div className="post-card-meta-actions">
          <span className="post-card-author">@{post.authorUsername}</span>
          {currentUser?.id === post.userId ? (
            <button
              type="button"
              className="post-card-delete-button"
              onClick={() => {
                void handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
      </header>
      <h3>{post.title}</h3>
      {imageSrc ? (
        <div className="post-card-image-wrapper">
          <img className="post-card-image" src={imageSrc} alt={post.title} />
        </div>
      ) : null}
      {shouldRenderBody ? <p>{post.content}</p> : null}
      <div className="post-card-vote-row">
        <button
          type="button"
          className={`post-card-vote-button ${userVote === 1 ? "active" : ""}`}
          onClick={() => {
            void handleVote(1);
          }}
          disabled={isVoting}
          aria-pressed={userVote === 1}
        >
          Like <span>{likeCount}</span>
        </button>
        <button
          type="button"
          className={`post-card-vote-button ${userVote === -1 ? "active" : ""}`}
          onClick={() => {
            void handleVote(-1);
          }}
          disabled={isVoting}
          aria-pressed={userVote === -1}
        >
          Dislike <span>{dislikeCount}</span>
        </button>
        {hideComments ? null : (
          <button
            type="button"
            className="post-card-comment-toggle"
            onClick={() => {
              void handleToggleComments();
            }}
          >
            {isCommentsOpen ? "Hide Comments" : "Show Comments"}
          </button>
        )}
        <button
          type="button"
          className={`post-card-save-button ${isSaved ? "active" : ""}`}
          onClick={() => {
            void handleSaveToggle();
          }}
          disabled={isSaving}
          aria-pressed={isSaved}
        >
          {isSaving ? "..." : isSaved ? "Saved" : "Save"}
        </button>
      </div>

      {hideComments ? null : (
        <>
          <div className="post-card-comment-form">
            <textarea
              rows={2}
              value={commentDraft}
              placeholder="Write a comment"
              onFocus={(event) => {
                if (!currentUser) {
                  event.target.blur();
                  requireLogin("to comment");
                }
              }}
              onChange={(event) => {
                setCommentDraft(event.target.value);
              }}
              disabled={isCommentSubmitting}
            />
            <button
              type="button"
              onClick={() => {
                void handleCreateComment();
              }}
              disabled={isCommentSubmitting}
            >
              {isCommentSubmitting ? "Posting..." : "Comment"}
            </button>
          </div>

          {isCommentsOpen ? (
            <section className="post-card-comments-section">
              {isCommentsLoading ? <p>Loading comments...</p> : null}
              {!isCommentsLoading && comments.length === 0 ? (
                <p>Be the first to comment.</p>
              ) : null}
              {!isCommentsLoading ? renderComments(comments) : null}
            </section>
          ) : null}
        </>
      )}

      <small>{formatRelativeTime(post.createdAt)}</small>
      {deleteMessage ? (
        <p className="post-card-delete-message">{deleteMessage}</p>
      ) : null}
      {voteMessage ? (
        <p className="post-card-vote-message">{voteMessage}</p>
      ) : null}
      {commentsMessage ? (
        <p className="post-card-comment-message">{commentsMessage}</p>
      ) : null}
    </article>
  );
}
