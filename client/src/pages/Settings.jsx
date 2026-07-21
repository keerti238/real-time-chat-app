import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

import {
  FaArrowLeft,
  FaBell,
  FaComments,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaMoon,
  FaSave,
  FaSignOutAlt,
  FaVolumeUp,
} from "react-icons/fa";

import "./Settings.css";

function Settings() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] =
    useState(false);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [savingPreferences, setSavingPreferences] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    loadPreferences();
  }, []);

  const loadPreferences = () => {
    try {
      const savedPreferences = JSON.parse(
        localStorage.getItem("chatPreferences") || "{}"
      );

      setNotificationsEnabled(
        savedPreferences.notificationsEnabled ?? true
      );

      setSoundEnabled(
        savedPreferences.soundEnabled ?? true
      );

      setDarkModeEnabled(
        savedPreferences.darkModeEnabled ?? false
      );
    } catch {
      setNotificationsEnabled(true);
      setSoundEnabled(true);
      setDarkModeEnabled(false);
    }
  };

  const savePreferences = () => {
    try {
      setSavingPreferences(true);

      const preferences = {
        notificationsEnabled,
        soundEnabled,
        darkModeEnabled,
      };

      localStorage.setItem(
        "chatPreferences",
        JSON.stringify(preferences)
      );

      toast.success("Preferences saved successfully");
    } catch (error) {
      console.error("Preference save error:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSavingPreferences(false);
    }
  };

  const changePassword = async () => {
    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error(
        "New password must contain at least 6 characters"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(
        "New password and confirm password do not match"
      );
      return;
    }

    if (currentPassword === newPassword) {
      toast.error(
        "New password must be different from current password"
      );
      return;
    }

    try {
      setChangingPassword(true);

      const response = await axios.put(
        "http://localhost:5000/api/auth/change-password",
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(
        response.data.message ||
          "Password changed successfully"
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password change error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to change password"
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    toast.success("Logged out successfully");

    navigate("/login", { replace: true });
  };

  return (
    <div
      className={
        darkModeEnabled
          ? "settings-page settings-dark"
          : "settings-page"
      }
    >
      <main className="settings-container">
        <header className="settings-topbar">
          <button
            type="button"
            className="settings-back-button"
            onClick={() => navigate("/dashboard")}
          >
            <FaArrowLeft />
            Dashboard
          </button>

          <div className="settings-heading">
            <h1>Settings</h1>
            <p>
              Manage your password and application preferences
            </p>
          </div>

          <button
            type="button"
            className="settings-chat-button"
            onClick={() => navigate("/chat")}
          >
            <FaComments />
            Open Chat
          </button>
        </header>

        <section className="settings-grid">
          <article className="settings-card">
            <div className="settings-card-heading">
              <div className="settings-heading-icon password">
                <FaLock />
              </div>

              <div>
                <h2>Change Password</h2>
                <p>
                  Use a strong password to protect your account
                </p>
              </div>
            </div>

            <div className="settings-password-form">
              <div className="settings-field">
                <label htmlFor="current-password">
                  Current Password
                </label>

                <div className="settings-password-input">
                  <input
                    id="current-password"
                    type={
                      showCurrentPassword
                        ? "text"
                        : "password"
                    }
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(event.target.value)
                    }
                    placeholder="Enter current password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword(
                        !showCurrentPassword
                      )
                    }
                  >
                    {showCurrentPassword ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </button>
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="new-password">
                  New Password
                </label>

                <div className="settings-password-input">
                  <input
                    id="new-password"
                    type={
                      showNewPassword ? "text" : "password"
                    }
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(event.target.value)
                    }
                    placeholder="Enter new password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(!showNewPassword)
                    }
                  >
                    {showNewPassword ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </button>
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="confirm-password">
                  Confirm New Password
                </label>

                <div className="settings-password-input">
                  <input
                    id="confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Confirm new password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >
                    {showConfirmPassword ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="settings-password-button"
                onClick={changePassword}
                disabled={changingPassword}
              >
                <FaLock />

                {changingPassword
                  ? "Changing..."
                  : "Change Password"}
              </button>
            </div>
          </article>

          <article className="settings-card">
            <div className="settings-card-heading">
              <div className="settings-heading-icon preferences">
                <FaBell />
              </div>

              <div>
                <h2>Preferences</h2>
                <p>
                  Customize your chat application experience
                </p>
              </div>
            </div>

            <div className="settings-preferences">
              <div className="settings-preference-row">
                <div className="settings-preference-info">
                  <div className="settings-preference-icon">
                    <FaBell />
                  </div>

                  <div>
                    <strong>Notifications</strong>
                    <span>
                      Receive alerts for new messages
                    </span>
                  </div>
                </div>

                <label className="settings-switch">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(event) =>
                      setNotificationsEnabled(
                        event.target.checked
                      )
                    }
                  />

                  <span />
                </label>
              </div>

              <div className="settings-preference-row">
                <div className="settings-preference-info">
                  <div className="settings-preference-icon">
                    <FaVolumeUp />
                  </div>

                  <div>
                    <strong>Message Sound</strong>
                    <span>
                      Play sound when a message arrives
                    </span>
                  </div>
                </div>

                <label className="settings-switch">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(event) =>
                      setSoundEnabled(event.target.checked)
                    }
                  />

                  <span />
                </label>
              </div>

              <div className="settings-preference-row">
                <div className="settings-preference-info">
                  <div className="settings-preference-icon">
                    <FaMoon />
                  </div>

                  <div>
                    <strong>Dark Mode</strong>
                    <span>
                      Use dark appearance on this page
                    </span>
                  </div>
                </div>

                <label className="settings-switch">
                  <input
                    type="checkbox"
                    checked={darkModeEnabled}
                    onChange={(event) =>
                      setDarkModeEnabled(
                        event.target.checked
                      )
                    }
                  />

                  <span />
                </label>
              </div>

              <button
                type="button"
                className="settings-save-button"
                onClick={savePreferences}
                disabled={savingPreferences}
              >
                <FaSave />

                {savingPreferences
                  ? "Saving..."
                  : "Save Preferences"}
              </button>
            </div>
          </article>

          <article className="settings-card settings-danger-card">
            <div className="settings-card-heading">
              <div className="settings-heading-icon danger">
                <FaSignOutAlt />
              </div>

              <div>
                <h2>Account Session</h2>
                <p>End your current application session</p>
              </div>
            </div>

            <div className="settings-logout-section">
              <div>
                <strong>Logout from this device</strong>
                <p>
                  You will need to enter your email and
                  password again.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default Settings;