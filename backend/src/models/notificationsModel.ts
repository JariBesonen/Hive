import { query } from "../db";

export type NotificationType =
  | "post_like"
  | "post_comment"
  | "post_reply"
  | "comment_like"
  | "comment_reply"
  | "hive_follow"
  | "hive_follow_accepted"
  | "follow_request"
  | "follow_request_accepted";

interface NotificationRow {
  id: number;
  recipient_user_id: number;
  actor_user_id: number;
  type: NotificationType;
  post_id: number | null;
  comment_id: number | null;
  hive_id: number | null;
  read_at: string | null;
  created_at: string;
  actor_username: string;
}

interface NotificationPreferenceRow {
  notifications_enabled: boolean;
  notify_post_likes: boolean;
  notify_post_comments: boolean;
  notify_replies: boolean;
  notify_comment_likes: boolean;
  notify_hive_follows: boolean;
}

export interface GroupedNotification {
  id: string;
  type: NotificationType;
  postId: number | null;
  commentId: number | null;
  hiveId: number | null;
  actorUsernames: string[];
  count: number;
  createdAt: string;
  read: boolean;
}

function buildGroupKey(notification: NotificationRow): string {
  switch (notification.type) {
    case "post_like":
    case "post_comment":
    case "post_reply":
      return `${notification.type}:post:${notification.post_id ?? 0}`;
    case "comment_like":
      return `${notification.type}:comment:${notification.comment_id ?? 0}`;
    case "comment_reply":
      return `${notification.type}:post:${notification.post_id ?? 0}`;
    case "hive_follow":
    case "hive_follow_accepted":
      return `${notification.type}:hive:${notification.hive_id ?? 0}`;
    default:
      return `${notification.type}:${notification.id}`;
  }
}

function toGroupedNotifications(
  rows: NotificationRow[],
): GroupedNotification[] {
  const groups = new Map<string, GroupedNotification>();

  rows.forEach((row) => {
    const key = buildGroupKey(row);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        id: key,
        type: row.type,
        postId: row.post_id,
        commentId: row.comment_id,
        hiveId: row.hive_id,
        actorUsernames: [row.actor_username],
        count: 1,
        createdAt: row.created_at,
        read: row.read_at !== null,
      });
      return;
    }

    existing.count += 1;
    if (!existing.actorUsernames.includes(row.actor_username)) {
      existing.actorUsernames.push(row.actor_username);
    }
    if (
      new Date(row.created_at).getTime() >
      new Date(existing.createdAt).getTime()
    ) {
      existing.createdAt = row.created_at;
      existing.postId = row.post_id;
      existing.commentId = row.comment_id;
      existing.hiveId = row.hive_id;
    }
    existing.read = existing.read && row.read_at !== null;
  });

  return Array.from(groups.values()).sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function isNotificationTypeEnabled(
  preferences: NotificationPreferenceRow,
  type: NotificationType,
): boolean {
  if (!preferences.notifications_enabled) {
    return false;
  }

  switch (type) {
    case "post_like":
      return preferences.notify_post_likes;
    case "post_comment":
      return preferences.notify_post_comments;
    case "post_reply":
    case "comment_reply":
      return preferences.notify_replies;
    case "comment_like":
      return preferences.notify_comment_likes;
    case "hive_follow":
    case "hive_follow_accepted":
      return preferences.notify_hive_follows;
    default:
      return true;
  }
}

export async function createNotification(params: {
  recipientUserId: number;
  actorUserId: number;
  type: NotificationType;
  postId?: number | null;
  commentId?: number | null;
  hiveId?: number | null;
}): Promise<void> {
  if (params.recipientUserId === params.actorUserId) {
    return;
  }

  const preferenceRows = await query<NotificationPreferenceRow>(
    `SELECT notifications_enabled, notify_post_likes, notify_post_comments,
            notify_replies, notify_comment_likes, notify_hive_follows
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [params.recipientUserId],
  );

  const preferences = preferenceRows[0];
  if (!preferences || !isNotificationTypeEnabled(preferences, params.type)) {
    return;
  }

  await query(
    `INSERT INTO notifications (
       recipient_user_id,
       actor_user_id,
       type,
       post_id,
       comment_id,
       hive_id
     )
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.recipientUserId,
      params.actorUserId,
      params.type,
      params.postId ?? null,
      params.commentId ?? null,
      params.hiveId ?? null,
    ],
  );
}

export async function getUnreadNotificationCount(
  recipientUserId: number,
): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM notifications
     WHERE recipient_user_id = $1 AND read_at IS NULL`,
    [recipientUserId],
  );

  return Number(rows[0]?.count ?? 0);
}

export async function getGroupedNotificationsForUser(
  recipientUserId: number,
): Promise<GroupedNotification[]> {
  const rows = await query<NotificationRow>(
    `SELECT n.id, n.recipient_user_id, n.actor_user_id, n.type, n.post_id, n.comment_id,
            n.hive_id, n.read_at, n.created_at, u.username AS actor_username
     FROM notifications n
     JOIN users u ON u.id = n.actor_user_id
     WHERE n.recipient_user_id = $1
     ORDER BY n.created_at DESC
     LIMIT 80`,
    [recipientUserId],
  );

  return toGroupedNotifications(rows);
}

export async function markNotificationsReadForUser(
  recipientUserId: number,
): Promise<void> {
  await query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE recipient_user_id = $1 AND read_at IS NULL`,
    [recipientUserId],
  );
}
