import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

import {
  FaCog,
  FaComments,
  FaEnvelope,
  FaSignOutAlt,
  FaUser,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";

import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const [loggedInUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!token || !loggedInUser) {
      navigate("/login", { replace: true });
      return;
    }

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);

      const response = await axios.get(
        "http://localhost:5000/api/auth/users",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const usersData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.users)
          ? response.data.users
          : [];

      setUsers(usersData);
    } catch (error) {
      console.error("Failed to load users:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load registered users"
      );

      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    toast.success("Logged out successfully");

    navigate("/login", { replace: true });
  };

  const onlineUsers = useMemo(() => {
    return users.filter((user) => user.isOnline).length;
  }, [users]);

  const getProfileImage = (profilePic) => {
    if (!profilePic) {
      return null;
    }

    if (
      profilePic.startsWith("http://") ||
      profilePic.startsWith("https://")
    ) {
      return profilePic;
    }

    return `http://localhost:5000${profilePic}`;
  };

  const loggedInUserImage = getProfileImage(
    loggedInUser?.profilePic
  );

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">
            <FaComments />
          </div>

          <div>
            <h2>Real-Time Chat</h2>
            <p>User Dashboard</p>
          </div>
        </div>

        <nav className="dashboard-navigation">
  <button
    type="button"
    className="dashboard-nav-item active"
  >
    <FaUsers />
    Dashboard
  </button>

  <button
    type="button"
    className="dashboard-nav-item"
    onClick={() => navigate("/chat")}
  >
    <FaComments />
    Open Chat
  </button>

 <button
  type="button"
  className="dashboard-nav-item"
  onClick={() => navigate("/profile")}
>
  <FaUser />
  My Profile
</button>

<button
  type="button"
  className="dashboard-nav-item"
  onClick={() => navigate("/settings")}
>
  <FaCog />
  Settings
</button>
</nav>

        <button
          type="button"
          className="dashboard-logout-button"
          onClick={handleLogout}
        >
          <FaSignOutAlt />
          Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-small-heading">
              Welcome back
            </span>

            <h1>
              Hello, {loggedInUser?.name || "User"} 👋
            </h1>

            <p>
              View your profile and registered-user information.
            </p>
          </div>

          <div className="dashboard-profile-card">
            <div className="dashboard-header-avatar">
              {loggedInUserImage ? (
                <img
                  src={loggedInUserImage}
                  alt={loggedInUser?.name || "Profile"}
                />
              ) : (
                <span>
                  {loggedInUser?.name
                    ?.charAt(0)
                    .toUpperCase() || "U"}
                </span>
              )}
            </div>

            <div className="dashboard-header-user-info">
              <strong>{loggedInUser?.name || "User"}</strong>

              <span>
                {loggedInUser?.email || "No email"}
              </span>
            </div>
          </div>
        </header>

        <section className="dashboard-welcome-card">
          <div className="dashboard-welcome-content">
            <span className="dashboard-welcome-badge">
              Account successfully authenticated
            </span>

            <h2>Welcome to your dashboard</h2>

            <p>
              Your login was successful. View your account details,
              registered users and application statistics.
            </p>
          </div>

          <div className="dashboard-welcome-graphic">
            <FaUser />
          </div>
        </section>

        <section className="dashboard-statistics">
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-icon">
              <FaUserFriends />
            </div>

            <div>
              <span>Total Users</span>

              <strong>
                {loadingUsers ? "..." : users.length}
              </strong>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-icon online">
              <FaUsers />
            </div>

            <div>
              <span>Online Users</span>

              <strong>
                {loadingUsers ? "..." : onlineUsers}
              </strong>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-icon account">
              <FaUser />
            </div>

            <div>
              <span>Account Status</span>
              <strong className="active-text">Active</strong>
            </div>
          </article>
        </section>

        <section className="dashboard-content-grid">
          <article className="dashboard-panel">
            <div className="dashboard-panel-heading">
              <div>
                <h2>My Account</h2>
                <p>Your stored login information</p>
              </div>
            </div>

            <div className="dashboard-account-details">
              <div className="dashboard-account-row">
                <div className="dashboard-account-icon">
                  <FaUser />
                </div>

                <div>
                  <span>Full Name</span>

                  <strong>
                    {loggedInUser?.name || "Not available"}
                  </strong>
                </div>
              </div>

              <div className="dashboard-account-row">
                <div className="dashboard-account-icon email">
                  <FaEnvelope />
                </div>

                <div>
                  <span>Email Address</span>

                  <strong>
                    {loggedInUser?.email || "Not available"}
                  </strong>
                </div>
              </div>

              <div className="dashboard-account-row">
                <div className="dashboard-account-icon status">
                  <FaUsers />
                </div>

                <div>
                  <span>Login Status</span>

                  <strong className="active-text">
                    Logged in
                  </strong>
                </div>
              </div>
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-heading">
              <div>
                <h2>Registered Users</h2>
                <p>Users available in the application</p>
              </div>

              <button
                type="button"
                className="dashboard-refresh-button"
                onClick={fetchUsers}
                disabled={loadingUsers}
              >
                {loadingUsers ? "Loading..." : "Refresh"}
              </button>
            </div>

            <div className="dashboard-users-list">
              {loadingUsers ? (
                <div className="dashboard-message">
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="dashboard-message">
                  No registered users found.
                </div>
              ) : (
                users.slice(0, 8).map((user) => {
                  const userImage = getProfileImage(
                    user.profilePic
                  );

                  return (
                    <div
                      className="dashboard-user-item"
                      key={user._id || user.id || user.email}
                    >
                      <div className="dashboard-user-avatar">
                        {userImage ? (
                          <img
                            src={userImage}
                            alt={user.name || "User"}
                          />
                        ) : (
                          <span>
                            {user.name
                              ?.charAt(0)
                              .toUpperCase() || "U"}
                          </span>
                        )}

                        <i
                          className={
                            user.isOnline
                              ? "dashboard-status online"
                              : "dashboard-status offline"
                          }
                        />
                      </div>

                      <div className="dashboard-user-information">
                        <strong>
                          {user.name || "Unknown User"}
                        </strong>

                        <span>
                          {user.email || "No email available"}
                        </span>
                      </div>

                      <div
                        className={
                          user.isOnline
                            ? "dashboard-user-state online"
                            : "dashboard-user-state"
                        }
                      >
                        {user.isOnline ? "Online" : "Offline"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;