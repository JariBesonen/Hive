import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PostCard from "../../Components/PostCard/PostCard";
import { api, type ApiPost } from "../../lib/api";
import "./Explore.css";

export default function Explore() {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [error, setError] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const query = searchParams.get("q")?.trim().toLowerCase() || "";

  const filteredPosts = query
    ? posts.filter((post: ApiPost) => {
        return (
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query) ||
          post.community.toLowerCase().includes(query) ||
          post.authorUsername.toLowerCase().includes(query) ||
          post.authorDisplayName.toLowerCase().includes(query)
        );
      })
    : posts;

  useEffect(() => {
    async function loadExplore(): Promise<void> {
      try {
        const response = await api.getExplorePosts();
        setPosts(response.posts);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load posts.",
        );
      } finally {
        setIsLoaded(true);
      }
    }

    void loadExplore();
  }, []);

  return (
    <main className="feed-page">
      <section className="feed-shell">
        <h2>Explore</h2>
        <p className="feed-description">
          Discover the latest conversations across Hive.
        </p>
        {query ? (
          <p className="feed-query">
            Showing results for "{searchParams.get("q")}"
          </p>
        ) : null}
        {error ? <p className="feed-error">{error}</p> : null}
        {!error && query && filteredPosts.length === 0 ? (
          <p className="feed-empty">No posts matched your search.</p>
        ) : null}
        {!error && !query && isLoaded && posts.length === 0 ? (
          <p className="feed-empty">No posts to show yet.</p>
        ) : null}
        <div className="feed-list">
          {filteredPosts.map((post: ApiPost) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </main>
  );
}
