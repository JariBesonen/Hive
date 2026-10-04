import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
//IMPORTED PAGES
import Home from "./Pages/Home/Home";
import Create from "./Pages/Create/module";
import Explore from "./Pages/Explore/Explore";
import HiveDetail from "./Pages/HiveDetail/HiveDetail";
import PostDetail from "./Pages/PostDetail/PostDetail";
import Profile from "./Pages/Profile/Profile";
import Search from "./Pages/Search/Search";
import Settings from "./Pages/Settings/Settings";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
import { Messages } from "./Pages/Messages/Messages";
//IMPORTED COMPONENTS

import Navbar from "./Components/Navbar/Navbar";
import SideNavbar from "./Components/SideNavbar/SideNavbar";
import "../src/Global.css";

function AppLayout() {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";
  const isHomeRoute = location.pathname === "/";
  const isSearchRoute = location.pathname === "/search";

  return (
    <div
      className={`app-shell ${isHomeRoute ? "home-route-shell" : ""} ${
        isSearchRoute ? "search-route-shell" : ""
      }`}
    >
      <Navbar />
      {!isAuthRoute ? <SideNavbar /> : null}
      <div className={`app-content ${isAuthRoute ? "auth-route-content" : ""}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/hive/:id" element={<HiveDetail />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/create" element={<Create />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="*"
            element={
              <main className="home-page">
                <section className="home-shell">
                  <h2>Page not found</h2>
                  <p className="home-description">
                    The page you requested does not exist.
                  </p>
                </section>
              </main>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
