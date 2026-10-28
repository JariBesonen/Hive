import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError, api } from "../../lib/api";
import "./Create.css";

export default function Create() {
  const navigate = useNavigate();
  const { currentUser, incrementHiveRefreshKey } = useAuth();

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [bannerError, setBannerError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  function clearBanner(): void {
    setBannerFile(null);
    setBannerPreview("");
    setBannerError("");
    setMessage("");

    const input = document.getElementById("hive-banner") as HTMLInputElement | null;
    if (input) {
      input.value = "";
    }
  }

  useEffect(() => {
    return () => {
      if (bannerPreview.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [bannerPreview]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (bannerError) {
      setMessage(bannerError);
      return;
    }

    if (!name.trim() || !description.trim()) {
      setMessage("Hive name and description are required.");
      return;
    }

    setMessage("");

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 5);

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("isPrivate", String(isPrivate));

      if (tags.length > 0) {
        formData.append("tags", tags.join(","));
      }

      if (bannerFile) {
        formData.append("bannerImage", bannerFile);
      }

      const response = await api.createHive(formData);
      incrementHiveRefreshKey();
      setMessage("Hive created successfully.");
      navigate(`/hive/${response.hive.id}`);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 409) {
        setMessage(
          "That hive name is already taken. Choose a different name and try again.",
        );
        return;
      }

      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create hive.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="create-post-page">
      <section className="create-post-shell">
        <h2>Create Hive</h2>
        {!currentUser ? (
          <p className="create-note">
            Login from the top navigation before creating a hive.
          </p>
        ) : null}
        <form
          className="create-post-form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label htmlFor="hive-name">Hive Name</label>
          <input
            id="hive-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            required
          />

          <label htmlFor="hive-description">Description</label>
          <textarea
            id="hive-description"
            rows={8}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            required
          />

          <label htmlFor="hive-banner">Banner Image</label>
          <input
            id="hive-banner"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                clearBanner();
                return;
              }

              if (file.size > 2 * 1024 * 1024) {
                clearBanner();
                const error = "Banner image must be 2MB or smaller.";
                setBannerError(error);
                setMessage(error);
                return;
              }

              if (!file.type.startsWith("image/")) {
                clearBanner();
                const error = "Banner file must be an image.";
                setBannerError(error);
                setMessage(error);
                return;
              }

              setBannerError("");
              setMessage("");
              if (bannerPreview.startsWith("blob:")) {
                URL.revokeObjectURL(bannerPreview);
              }
              setBannerFile(file);
              setBannerPreview(URL.createObjectURL(file));
            }}
          />

          {bannerError ? (
            <div className="create-banner-error" role="alert">
              <p>{bannerError}</p>
              <button type="button" onClick={clearBanner}>
                Dismiss and continue without a banner
              </button>
            </div>
          ) : null}

          {bannerPreview ? (
            <>
              <img
                className="create-banner-preview"
                src={bannerPreview}
                alt="Hive banner preview"
              />
              <button
                type="button"
                className="create-remove-banner"
                onClick={() => {
                  clearBanner();
                }}
              >
                Remove Banner
              </button>
            </>
          ) : null}

          <label htmlFor="hive-tags">Tags (comma separated, up to 5)</label>
          <input
            id="hive-tags"
            value={tagsInput}
            onChange={(event) => {
              setTagsInput(event.target.value);
            }}
            placeholder="gaming, art, technology"
          />

          <fieldset className="create-privacy-fieldset">
            <legend>Hive Privacy</legend>
            <label>
              <input
                type="radio"
                name="hive-privacy"
                checked={!isPrivate}
                onChange={() => {
                  setIsPrivate(false);
                }}
              />
              Public (anyone can view posts)
            </label>
            <label>
              <input
                type="radio"
                name="hive-privacy"
                checked={isPrivate}
                onChange={() => {
                  setIsPrivate(true);
                }}
              />
              Private (only joined members can view posts)
            </label>
          </fieldset>

          <button type="submit" disabled={!currentUser || isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Hive"}
          </button>
        </form>
        {message ? <p className="create-message">{message}</p> : null}
      </section>
    </main>
  );
}
