import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError, api } from "../../lib/api";
import "./Settings.css";

type NotificationPreferences = {
  all: boolean;
  postLikes: boolean;
  postComments: boolean;
  replies: boolean;
  commentLikes: boolean;
  hiveFollows: boolean;
};

const defaultNotificationPreferences: NotificationPreferences = {
  all: true,
  postLikes: true,
  postComments: true,
  replies: true,
  commentLikes: true,
  hiveFollows: true,
};

export default function Settings() {
  const navigate = useNavigate();
  const { currentUser, loading, refreshMe, deleteAccount } = useAuth();
  const [username, setUsername] = useState<string>(currentUser?.username || "");
  const [themePreference, setThemePreference] = useState<"light" | "dark">(
    currentUser?.themePreference || "dark",
  );
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(
      currentUser?.notificationPreferences || defaultNotificationPreferences,
    );
  const [isPrivate, setIsPrivate] = useState<boolean>(
    currentUser?.isPrivate ?? false,
  );
  const [settingsMessage, setSettingsMessage] = useState<string>("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>("");
  const [deleteMessage, setDeleteMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setUsername(currentUser.username);
    setThemePreference(currentUser.themePreference);
    setNotificationPreferences(
      currentUser.notificationPreferences || defaultNotificationPreferences,
    );
    setIsPrivate(currentUser.isPrivate ?? false);
  }, [currentUser]);

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login");
    }
  }, [loading, currentUser, navigate]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setSettingsMessage("Username is required.");
      return;
    }

    try {
      setIsSaving(true);
      setSettingsMessage("");
      await api.updateSettings({
        username: trimmedUsername,
        themePreference,
        isPrivate,
        notificationPreferences,
      });
      await refreshMe();
      setSettingsMessage("Settings updated.");
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        setSettingsMessage("Your session expired. Please log in again.");
        navigate("/login");
        return;
      }

      setSettingsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    try {
      setIsDeleting(true);
      setDeleteMessage("");
      await deleteAccount(deleteConfirmation.trim());
      navigate("/login");
    } catch (caughtError) {
      setDeleteMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete account.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="settings-page">
      <section className="settings-shell">
        <h2>Settings</h2>
        <form className="settings-form" onSubmit={handleSubmit}>
          <section className="settings-section">
            <h3>Appearance</h3>
            <p>Choose your preferred theme.</p>
            <div className="settings-theme-toggle">
              <label>
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={themePreference === "light"}
                  onChange={() => {
                    setThemePreference("light");
                  }}
                />
                Light
              </label>
              <label>
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={themePreference === "dark"}
                  onChange={() => {
                    setThemePreference("dark");
                  }}
                />
                Dark
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>Change Username</h3>
            <p>Username must be 3-40 characters and can include underscores.</p>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
              }}
            />
          </section>

          <section className="settings-section">
            <h3>Notifications</h3>
            <p>
              Mute all notifications or control individual notification types.
            </p>

            <label className="settings-checkbox-row">
              <input
                type="checkbox"
                checked={notificationPreferences.all}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setNotificationPreferences((current) => ({
                    ...current,
                    all: checked,
                  }));
                }}
              />
              Enable all notifications
            </label>

            <div className="settings-checkbox-list">
              <label className="settings-checkbox-row">
                <input
                  type="checkbox"
                  checked={notificationPreferences.postLikes}
                  disabled={!notificationPreferences.all}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setNotificationPreferences((current) => ({
                      ...current,
                      postLikes: checked,
                    }));
                  }}
                />
                Likes on your posts
              </label>

              <label className="settings-checkbox-row">
                <input
                  type="checkbox"
                  checked={notificationPreferences.postComments}
                  disabled={!notificationPreferences.all}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setNotificationPreferences((current) => ({
                      ...current,
                      postComments: checked,
                    }));
                  }}
                />
                Comments on your posts
              </label>

              <label className="settings-checkbox-row">
                <input
                  type="checkbox"
                  checked={notificationPreferences.replies}
                  disabled={!notificationPreferences.all}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setNotificationPreferences((current) => ({
                      ...current,
                      replies: checked,
                    }));
                  }}
                />
                Replies to your posts or comments
              </label>

              <label className="settings-checkbox-row">
                <input
                  type="checkbox"
                  checked={notificationPreferences.commentLikes}
                  disabled={!notificationPreferences.all}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setNotificationPreferences((current) => ({
                      ...current,
                      commentLikes: checked,
                    }));
                  }}
                />
                Likes on your comments
              </label>

              <label className="settings-checkbox-row">
                <input
                  type="checkbox"
                  checked={notificationPreferences.hiveFollows}
                  disabled={!notificationPreferences.all}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setNotificationPreferences((current) => ({
                      ...current,
                      hiveFollows: checked,
                    }));
                  }}
                />
                New followers of your hives
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>Account Privacy</h3>
            <p>Choose who can follow your account.</p>
            <label className="settings-checkbox-row">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(event) => {
                  setIsPrivate(event.target.checked);
                }}
              />
              Make my account private
            </label>
            <p>
              {isPrivate
                ? "Followers must request approval before they can follow you."
                : "Anyone can follow you instantly."}
            </p>
          </section>

          <button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </form>

        {settingsMessage ? (
          <p className="settings-message">{settingsMessage}</p>
        ) : null}

        <form className="settings-danger" onSubmit={handleDeleteAccount}>
          <h3>Delete Account</h3>
          <p>
            This is permanent. Type <strong>DELETE</strong> to confirm.
          </p>
          <label htmlFor="delete-confirmation">Confirmation</label>
          <input
            id="delete-confirmation"
            value={deleteConfirmation}
            onChange={(event) => {
              setDeleteConfirmation(event.target.value);
            }}
          />
          <button type="submit" disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </form>

        {deleteMessage ? (
          <p className="settings-error">{deleteMessage}</p>
        ) : null}
      </section>
    </main>
  );
}
