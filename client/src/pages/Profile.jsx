import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

import {
  FaArrowLeft,
  FaCamera,
  FaComments,
  FaEnvelope,
  FaSave,
  FaUser,
} from "react-icons/fa";

import "./Profile.css";

function Profile() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [name, setName] = useState(user?.name || "");
  const [profilePreview, setProfilePreview] = useState(
    user?.profilePic || ""
  );

  const [selectedImage, setSelectedImage] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const getProfileImage = (profilePic) => {
    if (!profilePic) {
      return null;
    }

    if (
      profilePic.startsWith("http://") ||
      profilePic.startsWith("https://") ||
      profilePic.startsWith("blob:") ||
      profilePic.startsWith("data:")
    ) {
      return profilePic;
    }

    return `http://localhost:5000${profilePic}`;
  };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);

      const response = await axios.get(
        "http://localhost:5000/api/auth/profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const profileData = response.data;

      const formattedUser = {
        id: profileData._id || profileData.id,
        name: profileData.name,
        email: profileData.email,
        profilePic: profileData.profilePic,
        isOnline: profileData.isOnline,
      };

      setUser(formattedUser);
      setName(formattedUser.name || "");
      setProfilePreview(formattedUser.profilePic || "");

      localStorage.setItem(
        "user",
        JSON.stringify(formattedUser)
      );
    } catch (error) {
      console.error("Profile fetch error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load profile"
      );

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Only JPG, JPEG, PNG and WEBP images are allowed"
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5 MB");
      return;
    }

    setSelectedImage(file);
    setProfilePreview(URL.createObjectURL(file));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("name", name.trim());

      if (selectedImage) {
        formData.append("profilePic", selectedImage);
      }

      const response = await axios.put(
        "http://localhost:5000/api/auth/profile",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUser = response.data.user;

      setUser(updatedUser);
      setName(updatedUser.name || "");
      setProfilePreview(updatedUser.profilePic || "");
      setSelectedImage(null);
      setEditing(false);

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      toast.success(
        response.data.message ||
          "Profile updated successfully"
      );
    } catch (error) {
      console.error("Profile update error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setProfilePreview(user?.profilePic || "");
    setSelectedImage(null);
    setEditing(false);
  };

  const profileImage = getProfileImage(profilePreview);

  if (loadingProfile) {
    return (
      <div className="profile-page">
        <div className="profile-error-card">
          <h2>Loading profile...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-error-card">
          <h2>User information not found</h2>

          <button
            type="button"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-background-circle circle-one" />
      <div className="profile-background-circle circle-two" />

      <main className="profile-container">
        <header className="profile-topbar">
          <button
            type="button"
            className="profile-back-button"
            onClick={() => navigate("/dashboard")}
          >
            <FaArrowLeft />
            Dashboard
          </button>

          <div className="profile-topbar-title">
            <h1>My Profile</h1>
            <p>View and manage your account information</p>
          </div>

          <button
            type="button"
            className="profile-chat-button"
            onClick={() => navigate("/chat")}
          >
            <FaComments />
            Open Chat
          </button>
        </header>

        <section className="profile-content">
          <article className="profile-summary-card">
            <div className="profile-cover">
              <div className="profile-cover-icon">
                <FaUser />
              </div>
            </div>

            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={user.name || "Profile"}
                  />
                ) : (
                  <span>
                    {user.name
                      ?.charAt(0)
                      .toUpperCase() || "U"}
                  </span>
                )}
              </div>

              <label
                className="profile-camera-button"
                title="Choose profile picture"
              >
                <FaCamera />

                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImageChange}
                />
              </label>
            </div>

            <div className="profile-summary-information">
              <h2>{user.name || "User"}</h2>
              <p>{user.email || "No email available"}</p>

              <span className="profile-active-badge">
                <i />
                Active Account
              </span>
            </div>

            <div className="profile-summary-stats">
              <div>
                <strong>Active</strong>
                <span>Account Status</span>
              </div>

              <div>
                <strong>Verified</strong>
                <span>Login Access</span>
              </div>
            </div>
          </article>

          <article className="profile-form-card">
            <div className="profile-form-heading">
              <div>
                <h2>Personal Information</h2>
                <p>Update your profile details</p>
              </div>

              {!editing && (
                <button
                  type="button"
                  className="profile-edit-button"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="profile-form">
              <div className="profile-field">
                <label htmlFor="profile-name">
                  <FaUser />
                  Full Name
                </label>

                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setEditing(true);
                  }}
                  disabled={!editing}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="profile-email">
                  <FaEnvelope />
                  Email Address
                </label>

                <input
                  id="profile-email"
                  type="email"
                  value={user.email || ""}
                  disabled
                />

                <small>
                  Email address cannot be changed.
                </small>
              </div>

              <div className="profile-field">
                <label>Account Status</label>

                <div className="profile-status-box">
                  <span className="profile-status-dot" />

                  <div>
                    <strong>Account is active</strong>
                    <p>
                      You can access the dashboard and chat.
                    </p>
                  </div>
                </div>
              </div>

              {editing && (
                <div className="profile-actions">
                  <button
                    type="button"
                    className="profile-cancel-button"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="profile-save-button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <FaSave />

                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default Profile;