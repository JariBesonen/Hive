import { query } from "./index";

export async function initDatabase(): Promise<void> {
  await query(
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(40) UNIQUE NOT NULL,
      email VARCHAR(120) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name VARCHAR(60) NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      theme_preference VARCHAR(10) NOT NULL DEFAULT 'dark',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
  );

  await query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(10) NOT NULL DEFAULT 'dark';`,
  );

  await query(
    `ALTER TABLE users
     ALTER COLUMN theme_preference SET DEFAULT 'dark';`,
  );

  await query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true;`,
  );

  await query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS notify_post_likes BOOLEAN NOT NULL DEFAULT true;`,
  );

  await query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS notify_post_comments BOOLEAN NOT NULL DEFAULT true;`,
  );

  await query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS notify_replies BOOLEAN NOT NULL DEFAULT true;`,
  );

  await query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS notify_comment_likes BOOLEAN NOT NULL DEFAULT true;`,
  );

  await query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS notify_hive_follows BOOLEAN NOT NULL DEFAULT true;`,
  );

  await query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS avatar_url TEXT;`,
  );

  await query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS banner_url TEXT;`,
  );

  await query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;`,
  );

  await query(
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1
         FROM pg_constraint
         WHERE conname = 'users_theme_preference_check'
       ) THEN
         ALTER TABLE users
           ADD CONSTRAINT users_theme_preference_check
           CHECK (theme_preference IN ('light', 'dark'));
       END IF;
     END
     $$;`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(180) NOT NULL,
      content TEXT NOT NULL,
      community VARCHAR(80) NOT NULL DEFAULT 'general',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
  );

  await query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS hive_id INTEGER;`);
  await query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT;`);
  await query(
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1
         FROM pg_constraint
         WHERE conname = 'posts_hive_id_fkey'
       ) THEN
         ALTER TABLE posts
           ADD CONSTRAINT posts_hive_id_fkey
           FOREIGN KEY (hive_id)
           REFERENCES hives(id)
           ON DELETE CASCADE;
       END IF;
     END
     $$;`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS follows (
      follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (follower_id, followed_id)
    );`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS follow_requests (
      id SERIAL PRIMARY KEY,
      requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (requester_id, recipient_id),
      CHECK (requester_id <> recipient_id)
    );`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS follow_requests_recipient_status_created_idx
     ON follow_requests (recipient_id, status, created_at DESC);`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS follow_requests_requester_status_created_idx
     ON follow_requests (requester_id, status, created_at DESC);`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS post_votes (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, post_id)
    );`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
  );

  await query(
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS comments_post_id_created_at_idx
     ON comments (post_id, created_at DESC);`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx
     ON comments (parent_comment_id);`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS comment_votes (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, comment_id)
    );`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS hives (
      id SERIAL PRIMARY KEY,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(80) UNIQUE NOT NULL,
      description TEXT NOT NULL,
      banner_image TEXT,
      tags TEXT[] NOT NULL DEFAULT '{}',
      is_private BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
  );

  await query(
    `ALTER TABLE hives
     ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS hive_memberships (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hive_id INTEGER NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, hive_id)
    );`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS hive_follow_requests (
      id SERIAL PRIMARY KEY,
      hive_id INTEGER NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
      requester_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (hive_id, requester_user_id)
    );`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS hive_follow_requests_hive_status_created_idx
     ON hive_follow_requests (hive_id, status, created_at DESC);`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(32) NOT NULL,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      hive_id INTEGER REFERENCES hives(id) ON DELETE CASCADE,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
     ON notifications (recipient_user_id, created_at DESC);`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS notifications_recipient_read_idx
     ON notifications (recipient_user_id, read_at);`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS saved_posts (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, post_id)
    );`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS saved_posts_user_created_idx
     ON saved_posts (user_id, created_at DESC);`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CHECK (sender_user_id <> recipient_user_id)
    );`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS messages_recipient_sender_created_idx
     ON messages (recipient_user_id, sender_user_id, created_at DESC);`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS messages_sender_recipient_created_idx
     ON messages (sender_user_id, recipient_user_id, created_at DESC);`,
  );

  await query(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS messages_unread_idx
     ON messages (recipient_user_id, read_at) WHERE read_at IS NULL;`,
  );
}
