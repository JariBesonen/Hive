import { query } from "../db";

export interface ProfileUserRow {
  id: number;
  username: string;
  email: string;
  display_name: string;
  bio: string;
  theme_preference: "light" | "dark";
  notifications_enabled: boolean;
  notify_post_likes: boolean;
  notify_post_comments: boolean;
  notify_replies: boolean;
  notify_comment_likes: boolean;
  notify_hive_follows: boolean;
  avatar_url: string | null;
  banner_url: string | null;
  is_private: boolean;
  created_at: string;
}

export type FollowRequestStatus = "pending" | "approved" | "denied";

export interface FollowRequestRow {
  id: number;
  requester_id: number;
  recipient_id: number;
  status: FollowRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface IncomingFollowRequestRow {
  id: number;
  requester_id: number;
  requester_username: string;
  requester_display_name: string;
  requester_avatar_url: string | null;
  created_at: string;
}

interface NotificationPreferencesUpdate {
  all?: boolean;
  postLikes?: boolean;
  postComments?: boolean;
  replies?: boolean;
  commentLikes?: boolean;
  hiveFollows?: boolean;
}

const profileUserSelect =
  "id, username, email, display_name, bio, theme_preference, notifications_enabled, notify_post_likes, notify_post_comments, notify_replies, notify_comment_likes, notify_hive_follows, avatar_url, banner_url, is_private, created_at";

export interface UserPostRow {
  id: number;
  user_id: number;
  hive_id: number | null;
  title: string;
  content: string;
  community: string;
  image_url: string | null;
  created_at: string;
  username: string;
  display_name: string;
  like_count: number;
  dislike_count: number;
  user_vote: number | null;
}

export interface ProfileCommentRow {
  id: number;
  post_id: number;
  user_id: number;
  parent_comment_id: number | null;
  content: string;
  deleted_at: string | null;
  created_at: string;
  username: string;
  display_name: string;
  like_count: number;
  dislike_count: number;
  user_vote: number | null;
  post_title: string;
  post_community: string;
}

export interface OwnedHiveRow {
  id: number;
  name: string;
}

export async function getProfileUserById(
  userId: number,
): Promise<ProfileUserRow | null> {
  const rows = await query<ProfileUserRow>(
    `SELECT ${profileUserSelect} FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );

  return rows[0] || null;
}

export async function getProfileUserByUsername(
  username: string,
): Promise<ProfileUserRow | null> {
  const rows = await query<ProfileUserRow>(
    `SELECT ${profileUserSelect}
     FROM users
     WHERE LOWER(username) = LOWER($1)
     LIMIT 1`,
    [username],
  );

  return rows[0] || null;
}

function postVoteSelect(userVoteExpression: string): string {
  return `
    p.id,
    p.user_id,
    p.hive_id,
    p.title,
    p.content,
    p.community,
    p.image_url,
    p.created_at,
    u.username,
    u.display_name,
    COALESCE((SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote = 1), 0) AS like_count,
    COALESCE((SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote = -1), 0) AS dislike_count,
    ${userVoteExpression} AS user_vote
  `;
}

export async function getProfilePostsByUserId(
  userId: number,
  viewerUserId?: number,
): Promise<UserPostRow[]> {
  return query<UserPostRow>(
    `SELECT ${postVoteSelect(
      typeof viewerUserId === "number"
        ? `COALESCE((SELECT pv.vote FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = $2 LIMIT 1), 0)`
        : `0::smallint`,
    )}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1
    ORDER BY p.created_at DESC
     LIMIT 50`,
    typeof viewerUserId === "number" ? [userId, viewerUserId] : [userId],
  );
}

function commentVoteSelect(userVoteExpression: string): string {
  return `
    c.id,
    c.post_id,
    c.user_id,
    c.parent_comment_id,
    c.content,
    c.deleted_at,
    c.created_at,
    u.username,
    u.display_name,
    COALESCE((SELECT COUNT(*) FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.vote = 1), 0) AS like_count,
    COALESCE((SELECT COUNT(*) FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.vote = -1), 0) AS dislike_count,
    ${userVoteExpression} AS user_vote,
    p.title AS post_title,
    p.community AS post_community
  `;
}

export async function getProfileTopLevelCommentsByUserId(
  userId: number,
  viewerUserId?: number,
): Promise<ProfileCommentRow[]> {
  return query<ProfileCommentRow>(
    `SELECT ${commentVoteSelect(
      typeof viewerUserId === "number"
        ? `COALESCE((SELECT cv.vote FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.user_id = $2 LIMIT 1), 0)`
        : `0::smallint`,
    )}
     FROM comments c
     JOIN users u ON u.id = c.user_id
     JOIN posts p ON p.id = c.post_id
     WHERE c.user_id = $1 AND c.parent_comment_id IS NULL
     ORDER BY c.created_at DESC
     LIMIT 50`,
    typeof viewerUserId === "number" ? [userId, viewerUserId] : [userId],
  );
}

export async function getOwnedHivesByUserId(
  userId: number,
): Promise<OwnedHiveRow[]> {
  return query<OwnedHiveRow>(
    `SELECT id, name
     FROM hives
     WHERE owner_user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
}

export async function getFollowerCountByUserId(
  userId: number,
): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM follows
     WHERE followed_id = $1`,
    [userId],
  );

  return Number(rows[0]?.count ?? 0);
}

export async function isFollowingUser(
  followerId: number,
  followedId: number,
): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM follows
       WHERE follower_id = $1 AND followed_id = $2
     )`,
    [followerId, followedId],
  );

  return rows[0]?.exists ?? false;
}

export async function followUser(
  followerId: number,
  followedId: number,
): Promise<void> {
  await query(
    `INSERT INTO follows (follower_id, followed_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, followed_id) DO NOTHING`,
    [followerId, followedId],
  );
}

export async function unfollowUser(
  followerId: number,
  followedId: number,
): Promise<void> {
  await query(
    `DELETE FROM follows
     WHERE follower_id = $1 AND followed_id = $2`,
    [followerId, followedId],
  );
}

export async function getFollowRequestBetweenUsers(
  requesterId: number,
  recipientId: number,
): Promise<FollowRequestRow | null> {
  const rows = await query<FollowRequestRow>(
    `SELECT id, requester_id, recipient_id, status, created_at, updated_at
     FROM follow_requests
     WHERE requester_id = $1 AND recipient_id = $2
     LIMIT 1`,
    [requesterId, recipientId],
  );

  return rows[0] || null;
}

export async function createOrReopenFollowRequest(
  requesterId: number,
  recipientId: number,
): Promise<FollowRequestRow> {
  const rows = await query<FollowRequestRow>(
    `INSERT INTO follow_requests (requester_id, recipient_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (requester_id, recipient_id)
     DO UPDATE
     SET status = 'pending',
         updated_at = NOW()
     RETURNING id, requester_id, recipient_id, status, created_at, updated_at`,
    [requesterId, recipientId],
  );

  return rows[0];
}

export async function cancelPendingFollowRequest(
  requesterId: number,
  recipientId: number,
): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `DELETE FROM follow_requests
     WHERE requester_id = $1
       AND recipient_id = $2
       AND status = 'pending'
     RETURNING id`,
    [requesterId, recipientId],
  );

  return rows.length > 0;
}

export async function listIncomingPendingFollowRequests(
  recipientId: number,
): Promise<IncomingFollowRequestRow[]> {
  return query<IncomingFollowRequestRow>(
    `SELECT fr.id,
            fr.requester_id,
            u.username AS requester_username,
            u.display_name AS requester_display_name,
            u.avatar_url AS requester_avatar_url,
            fr.created_at
     FROM follow_requests fr
     JOIN users u ON u.id = fr.requester_id
     WHERE fr.recipient_id = $1
       AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [recipientId],
  );
}

export async function approveFollowRequestById(
  requestId: number,
  recipientId: number,
): Promise<FollowRequestRow | null> {
  const rows = await query<FollowRequestRow>(
    `UPDATE follow_requests
     SET status = 'approved',
         updated_at = NOW()
     WHERE id = $1
       AND recipient_id = $2
       AND status = 'pending'
     RETURNING id, requester_id, recipient_id, status, created_at, updated_at`,
    [requestId, recipientId],
  );

  const request = rows[0] || null;
  if (!request) {
    return null;
  }

  await followUser(request.requester_id, request.recipient_id);
  return request;
}

export async function denyFollowRequestById(
  requestId: number,
  recipientId: number,
): Promise<FollowRequestRow | null> {
  const rows = await query<FollowRequestRow>(
    `UPDATE follow_requests
     SET status = 'denied',
         updated_at = NOW()
     WHERE id = $1
       AND recipient_id = $2
       AND status = 'pending'
     RETURNING id, requester_id, recipient_id, status, created_at, updated_at`,
    [requestId, recipientId],
  );

  return rows[0] || null;
}

export async function approveAllPendingFollowRequestsForRecipient(
  recipientId: number,
): Promise<number[]> {
  const rows = await query<{ requester_id: number }>(
    `UPDATE follow_requests
     SET status = 'approved',
         updated_at = NOW()
     WHERE recipient_id = $1
       AND status = 'pending'
     RETURNING requester_id`,
    [recipientId],
  );

  await Promise.all(
    rows.map((row) => followUser(row.requester_id, recipientId)),
  );

  return rows.map((row) => row.requester_id);
}

export async function canViewerAccessPrivateProfile(
  viewerUserId: number | undefined,
  profileUserId: number,
  profileIsPrivate: boolean,
): Promise<boolean> {
  if (!profileIsPrivate) {
    return true;
  }

  if (!viewerUserId) {
    return false;
  }

  if (viewerUserId === profileUserId) {
    return true;
  }

  return isFollowingUser(viewerUserId, profileUserId);
}

export async function updateProfileSettings(
  userId: number,
  username?: string,
  displayName?: string,
  bio?: string,
  themePreference?: "light" | "dark",
  notificationPreferences?: NotificationPreferencesUpdate,
  avatarUrl?: string | null,
  bannerUrl?: string | null,
  isPrivate?: boolean,
): Promise<ProfileUserRow | null> {
  const rows = await query<ProfileUserRow>(
    `UPDATE users
     SET username = COALESCE($2, username),
         display_name = COALESCE($3, display_name),
         bio = COALESCE($4, bio),
         theme_preference = COALESCE($5, theme_preference),
         notifications_enabled = COALESCE($6, notifications_enabled),
         notify_post_likes = COALESCE($7, notify_post_likes),
         notify_post_comments = COALESCE($8, notify_post_comments),
         notify_replies = COALESCE($9, notify_replies),
         notify_comment_likes = COALESCE($10, notify_comment_likes),
         notify_hive_follows = COALESCE($11, notify_hive_follows),
         avatar_url = COALESCE($12, avatar_url),
         banner_url = COALESCE($13, banner_url),
         is_private = COALESCE($14, is_private),
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${profileUserSelect}`,
    [
      userId,
      username,
      displayName,
      bio,
      themePreference,
      notificationPreferences?.all,
      notificationPreferences?.postLikes,
      notificationPreferences?.postComments,
      notificationPreferences?.replies,
      notificationPreferences?.commentLikes,
      notificationPreferences?.hiveFollows,
      avatarUrl,
      bannerUrl,
      isPrivate,
    ],
  );

  return rows[0] || null;
}

export async function savePost(userId: number, postId: number): Promise<void> {
  await query(
    `INSERT INTO saved_posts (user_id, post_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, post_id) DO NOTHING`,
    [userId, postId],
  );
}

export async function unsavePost(
  userId: number,
  postId: number,
): Promise<void> {
  await query(
    `DELETE FROM saved_posts
     WHERE user_id = $1 AND post_id = $2`,
    [userId, postId],
  );
}

export async function isPostSaved(
  userId: number,
  postId: number,
): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM saved_posts
       WHERE user_id = $1 AND post_id = $2
     )`,
    [userId, postId],
  );

  return rows[0]?.exists ?? false;
}

export async function getSavedPostsByUserId(
  userId: number,
): Promise<UserPostRow[]> {
  return query<UserPostRow>(
    `SELECT ${postVoteSelect(
      `COALESCE((SELECT pv.vote FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = $1 LIMIT 1), 0)`,
    )}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN saved_posts sp ON sp.post_id = p.id
     WHERE sp.user_id = $1
     ORDER BY sp.created_at DESC`,
    [userId],
  );
}
