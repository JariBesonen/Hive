import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { findUserByUsername } from "../models/authModel";
import { createNotification } from "../models/notificationsModel";
import { mapPost } from "../models/postsModel";
import {
  approveAllPendingFollowRequestsForRecipient,
  approveFollowRequestById,
  canViewerAccessPrivateProfile,
  cancelPendingFollowRequest,
  createOrReopenFollowRequest,
  denyFollowRequestById,
  followUser,
  getFollowRequestBetweenUsers,
  getFollowerCountByUserId,
  listIncomingPendingFollowRequests,
  getOwnedHivesByUserId,
  getProfileTopLevelCommentsByUserId,
  getProfilePostsByUserId,
  getProfileUserById,
  getProfileUserByUsername,
  getSavedPostsByUserId,
  isFollowingUser,
  unfollowUser,
  updateProfileSettings,
} from "../models/profileModel";

function mapProfileUser(user: {
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
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    bio: user.bio,
    themePreference: user.theme_preference,
    avatarUrl: user.avatar_url,
    bannerUrl: user.banner_url,
    isPrivate: user.is_private,
    notificationPreferences: {
      all: user.notifications_enabled,
      postLikes: user.notify_post_likes,
      postComments: user.notify_post_comments,
      replies: user.notify_replies,
      commentLikes: user.notify_comment_likes,
      hiveFollows: user.notify_hive_follows,
    },
    createdAt: user.created_at,
  };
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

function resolveUsernameParam(
  usernameParam: string | string[] | undefined,
): string {
  return Array.isArray(usernameParam)
    ? (usernameParam[0] || "").trim()
    : (usernameParam || "").trim();
}

function mapProfileComment(comment: {
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
}) {
  return {
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    parentCommentId: comment.parent_comment_id,
    content: comment.content,
    isDeleted: comment.deleted_at !== null,
    createdAt: comment.created_at,
    authorUsername: comment.username,
    authorDisplayName: comment.display_name,
    likeCount: Number(comment.like_count) || 0,
    dislikeCount: Number(comment.dislike_count) || 0,
    userVote: comment.user_vote === null ? null : Number(comment.user_vote),
    postTitle: comment.post_title,
    postCommunity: comment.post_community,
  };
}

export async function me(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const user = await getProfileUserById(req.session.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const posts = await getProfilePostsByUserId(
    req.session.userId,
    req.session.userId,
  );
  return res.status(200).json({
    user: mapProfileUser(user),
    posts: posts.map(mapPost),
  });
}

export async function byUsername(
  req: Request,
  res: Response,
): Promise<Response> {
  const username = resolveUsernameParam(req.params.username);
  if (!username) {
    return res.status(400).json({ message: "Username is required." });
  }

  const user = await getProfileUserByUsername(username);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const canViewActivity = await canViewerAccessPrivateProfile(
    req.session.userId,
    user.id,
    user.is_private,
  );

  const isOwnProfile = req.session.userId === user.id;

  let isFollowing = false;
  if (req.session.userId && !isOwnProfile) {
    isFollowing = await isFollowingUser(req.session.userId, user.id);
  }

  const followRequest =
    req.session.userId && !isOwnProfile
      ? await getFollowRequestBetweenUsers(req.session.userId, user.id)
      : null;

  const followRequestStatus = isFollowing
    ? "accepted"
    : followRequest?.status === "pending"
      ? "pending"
      : "none";

  const [followerCount, ownedHives] = await Promise.all([
    getFollowerCountByUserId(user.id),
    getOwnedHivesByUserId(user.id),
  ]);

  if (!canViewActivity) {
    return res.status(200).json({
      user: mapProfileUser(user),
      posts: [],
      comments: [],
      followerCount,
      isFollowing,
      followRequestStatus,
      ownedHives,
      isLimitedProfile: true,
    });
  }

  const [posts, comments] = await Promise.all([
    getProfilePostsByUserId(user.id, req.session.userId),
    getProfileTopLevelCommentsByUserId(user.id, req.session.userId),
  ]);

  return res.status(200).json({
    user: mapProfileUser(user),
    posts: posts.map(mapPost),
    comments: comments.map(mapProfileComment),
    followerCount,
    isFollowing,
    followRequestStatus,
    ownedHives,
    isLimitedProfile: false,
  });
}

export async function follow(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const username = resolveUsernameParam(req.params.username);
  if (!username) {
    return res.status(400).json({ message: "Username is required." });
  }

  const targetUser = await getProfileUserByUsername(username);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found." });
  }

  if (targetUser.id === req.session.userId) {
    return res.status(400).json({ message: "You cannot follow yourself." });
  }

  const alreadyFollowing = await isFollowingUser(
    req.session.userId,
    targetUser.id,
  );
  if (alreadyFollowing) {
    const followerCount = await getFollowerCountByUserId(targetUser.id);
    return res.status(200).json({
      message: "Already following user.",
      followerCount,
      isFollowing: true,
      requestStatus: "accepted",
    });
  }

  if (targetUser.is_private) {
    const request = await createOrReopenFollowRequest(
      req.session.userId,
      targetUser.id,
    );
    await createNotification({
      recipientUserId: targetUser.id,
      actorUserId: req.session.userId,
      type: "follow_request",
    });
    const followerCount = await getFollowerCountByUserId(targetUser.id);

    return res.status(202).json({
      message: "Follow request sent.",
      followerCount,
      isFollowing: false,
      requestStatus: request.status,
    });
  }

  await followUser(req.session.userId, targetUser.id);
  const followerCount = await getFollowerCountByUserId(targetUser.id);

  return res.status(200).json({
    message: "Followed user.",
    followerCount,
    isFollowing: true,
    requestStatus: "accepted",
  });
}

export async function unfollow(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const username = resolveUsernameParam(req.params.username);
  if (!username) {
    return res.status(400).json({ message: "Username is required." });
  }

  const targetUser = await getProfileUserByUsername(username);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found." });
  }

  if (targetUser.id === req.session.userId) {
    return res.status(400).json({ message: "You cannot unfollow yourself." });
  }

  const wasFollowing = await isFollowingUser(req.session.userId, targetUser.id);

  if (targetUser.is_private && !wasFollowing) {
    const canceled = await cancelPendingFollowRequest(
      req.session.userId,
      targetUser.id,
    );
    const followerCount = await getFollowerCountByUserId(targetUser.id);

    return res.status(200).json({
      message: canceled
        ? "Follow request canceled."
        : "No pending follow request.",
      followerCount,
      isFollowing: false,
      requestStatus: "none",
    });
  }

  await unfollowUser(req.session.userId, targetUser.id);
  const followerCount = await getFollowerCountByUserId(targetUser.id);

  return res.status(200).json({
    message: "Unfollowed user.",
    followerCount,
    isFollowing: false,
    requestStatus: "none",
  });
}

export async function getFollowRequests(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const requests = await listIncomingPendingFollowRequests(req.session.userId);
  return res.status(200).json({
    requests: requests.map((request) => ({
      id: request.id,
      requesterId: request.requester_id,
      requesterUsername: request.requester_username,
      requesterDisplayName: request.requester_display_name,
      requesterAvatarUrl: request.requester_avatar_url,
      createdAt: request.created_at,
    })),
  });
}

export async function approveFollowRequest(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const requestIdParam = resolveUsernameParam(req.params.requestId);
  const requestId = Number.parseInt(requestIdParam, 10);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ message: "Invalid follow request id." });
  }

  const approved = await approveFollowRequestById(
    requestId,
    req.session.userId,
  );
  if (!approved) {
    return res.status(404).json({ message: "Follow request not found." });
  }

  await createNotification({
    recipientUserId: approved.requester_id,
    actorUserId: req.session.userId,
    type: "follow_request_accepted",
  });

  const followerCount = await getFollowerCountByUserId(req.session.userId);
  return res.status(200).json({
    message: "Follow request approved.",
    followerCount,
  });
}

export async function denyFollowRequest(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const requestIdParam = resolveUsernameParam(req.params.requestId);
  const requestId = Number.parseInt(requestIdParam, 10);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ message: "Invalid follow request id." });
  }

  const denied = await denyFollowRequestById(requestId, req.session.userId);
  if (!denied) {
    return res.status(404).json({ message: "Follow request not found." });
  }

  return res.status(200).json({
    message: "Follow request denied.",
  });
}

export async function settings(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const uploadedFiles = (req.files ?? {}) as {
    avatarImage?: Express.Multer.File[];
    bannerImage?: Express.Multer.File[];
  };

  const { username, displayName, bio, themePreference, isPrivate } =
    req.body as {
      notificationPreferences?: {
        all?: boolean;
        postLikes?: boolean;
        postComments?: boolean;
        replies?: boolean;
        commentLikes?: boolean;
        hiveFollows?: boolean;
      };
      username?: string;
      displayName?: string;
      bio?: string;
      themePreference?: "light" | "dark";
      isPrivate?: boolean | string;
    };
  const { notificationPreferences } = req.body as {
    notificationPreferences?: {
      all?: boolean;
      postLikes?: boolean;
      postComments?: boolean;
      replies?: boolean;
      commentLikes?: boolean;
      hiveFollows?: boolean;
    };
  };

  const currentUser = await getProfileUserById(req.session.userId);
  if (!currentUser) {
    return res.status(404).json({ message: "User not found." });
  }

  const trimmedUsername = username?.trim();
  const trimmedDisplayName = displayName?.trim();
  const trimmedBio = bio?.trim();
  const avatarFile = uploadedFiles.avatarImage?.[0] ?? null;
  const bannerFile = uploadedFiles.bannerImage?.[0] ?? null;
  const nextAvatarUrl = avatarFile
    ? `/uploads/users/${avatarFile.filename}`
    : undefined;
  const nextBannerUrl = bannerFile
    ? `/uploads/users/${bannerFile.filename}`
    : undefined;
  const parsedIsPrivate = parseOptionalBoolean(isPrivate);

  if (isPrivate !== undefined && parsedIsPrivate === undefined) {
    return res
      .status(400)
      .json({ message: "isPrivate must be a boolean value." });
  }

  if (trimmedUsername) {
    if (!/^[a-zA-Z0-9_]{3,40}$/.test(trimmedUsername)) {
      return res.status(400).json({
        message:
          "Username must be 3-40 characters and contain only letters, numbers, or underscores.",
      });
    }

    if (trimmedUsername.toLowerCase() !== currentUser.username.toLowerCase()) {
      const existingUser = await findUserByUsername(trimmedUsername);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists." });
      }
    }
  }

  if (
    themePreference &&
    themePreference !== "light" &&
    themePreference !== "dark"
  ) {
    return res
      .status(400)
      .json({ message: "Theme preference must be light or dark." });
  }

  if (notificationPreferences) {
    const preferenceValues = Object.values(notificationPreferences).filter(
      (value) => value !== undefined,
    );
    const hasInvalidPreference = preferenceValues.some(
      (value) => typeof value !== "boolean",
    );

    if (hasInvalidPreference) {
      return res.status(400).json({
        message: "Notification preferences must be boolean values.",
      });
    }
  }

  const user = await updateProfileSettings(
    req.session.userId,
    trimmedUsername,
    trimmedDisplayName,
    trimmedBio,
    themePreference,
    notificationPreferences,
    nextAvatarUrl,
    nextBannerUrl,
    parsedIsPrivate,
  );
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (
    nextAvatarUrl &&
    currentUser.avatar_url &&
    currentUser.avatar_url !== nextAvatarUrl
  ) {
    const absoluteAvatarPath = path.resolve(
      process.cwd(),
      currentUser.avatar_url.replace(/^\//, ""),
    );
    fs.promises.unlink(absoluteAvatarPath).catch(() => undefined);
  }

  if (
    nextBannerUrl &&
    currentUser.banner_url &&
    currentUser.banner_url !== nextBannerUrl
  ) {
    const absoluteBannerPath = path.resolve(
      process.cwd(),
      currentUser.banner_url.replace(/^\//, ""),
    );
    fs.promises.unlink(absoluteBannerPath).catch(() => undefined);
  }

  if (currentUser.is_private && parsedIsPrivate === false) {
    const approvedRequesterIds =
      await approveAllPendingFollowRequestsForRecipient(req.session.userId);
    await Promise.all(
      approvedRequesterIds.map((requesterId) =>
        createNotification({
          recipientUserId: requesterId,
          actorUserId: req.session.userId as number,
          type: "follow_request_accepted",
        }),
      ),
    );
  }

  return res.status(200).json({ user: mapProfileUser(user) });
}

export async function getSavedPosts(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const posts = await getSavedPostsByUserId(req.session.userId);
  return res.status(200).json({ posts: posts.map(mapPost) });
}
