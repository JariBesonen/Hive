import "./Home.css";
import { useEffect, useState } from "react";
import PostCard from "../../Components/PostCard/PostCard";
import { api, type ApiPost } from "../../lib/api";

function Home() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadHome(): Promise<void> {
      try {
        const response = await api.getHomePosts();
        setPosts(response.posts);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load home feed.",
        );
      }
    }

    void loadHome();
  }, []);

  return (
    <main className="home-page">
      <section className="home-shell">
        {error ? <p className="home-error">{error}</p> : null}
        <div className="home-list">
          {posts.map((post: ApiPost) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </main>
  );
}

export default Home;
