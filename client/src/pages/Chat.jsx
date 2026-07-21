import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  FaCamera,
  FaEllipsisV,
  FaPaperclip,
  FaPaperPlane,
  FaSearch,
  FaSignOutAlt,
} from "react-icons/fa";
import "./Chat.css";

const API_URL = "http://localhost:5000";
const socket = io(API_URL);

function Chat() {
  const savedUser = JSON.parse(
    localStorage.getItem("user")
  );

  const token = localStorage.getItem("token");

  const [currentUser, setCurrentUser] =
    useState(savedUser);

  const loggedInUserId =
    currentUser?.id || currentUser?._id;

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] =
    useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isUploading, setIsUploading] =
    useState(false);
  const [isSendingImage, setIsSendingImage] =
    useState(false);
  const [openDeleteMenuId, setOpenDeleteMenuId] =
    useState(null);

  const [openReactionMenuId, setOpenReactionMenuId] =
    useState(null);

  const [unreadCounts, setUnreadCounts] =
    useState({});

  const [lastMessages, setLastMessages] =
    useState({});

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const profileInputRef = useRef(null);
  const chatImageInputRef = useRef(null);

  useEffect(() => {
    if (!loggedInUserId) {
      window.location.href = "/login";
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("joinUser", loggedInUserId);

    fetchUsers();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  useEffect(() => {
    const receiveMessage = (newMessage) => {
      const senderId =
        typeof newMessage.sender === "object"
          ? newMessage.sender._id
          : newMessage.sender;

      const receiverId =
        typeof newMessage.receiver === "object"
          ? newMessage.receiver._id
          : newMessage.receiver;

      const otherUserId =
        senderId === loggedInUserId
          ? receiverId
          : senderId;

      setLastMessages((previousMessages) => ({
        ...previousMessages,
        [otherUserId]: {
          _id: newMessage._id,
          text: newMessage.text,
          messageType: newMessage.messageType || "text",
          imageUrl: newMessage.imageUrl || "",
          createdAt:
            newMessage.createdAt ||
            new Date().toISOString(),
          senderId,
        },
      }));

      const isCurrentConversation =
        selectedUser &&
        ((senderId === loggedInUserId &&
          receiverId === selectedUser._id) ||
          (senderId === selectedUser._id &&
            receiverId === loggedInUserId));

      if (isCurrentConversation) {
        setMessages((previousMessages) => [
          ...previousMessages,
          {
            ...newMessage,
            reactions: Array.isArray(newMessage.reactions)
              ? newMessage.reactions
              : [],
          },
        ]);

        if (senderId !== loggedInUserId) {
          setUnreadCounts((previousCounts) => ({
            ...previousCounts,
            [senderId]: 0,
          }));

          markMessagesAsSeen(senderId);
        }
      } else {
        const isIncomingMessage =
          receiverId === loggedInUserId &&
          senderId !== loggedInUserId;

        if (isIncomingMessage) {
          setUnreadCounts((previousCounts) => ({
            ...previousCounts,
            [senderId]:
              (previousCounts[senderId] || 0) + 1,
          }));
        }
      }
    };

    const userTyping = ({ senderId }) => {
      if (
        selectedUser &&
        senderId === selectedUser._id
      ) {
        setIsTyping(true);
      }
    };

    const userStoppedTyping = ({ senderId }) => {
      if (
        selectedUser &&
        senderId === selectedUser._id
      ) {
        setIsTyping(false);
      }
    };

    const userStatusChanged = ({
      userId,
      isOnline,
      lastSeen,
    }) => {
      setUsers((previousUsers) =>
        previousUsers.map((user) =>
          user._id === userId
            ? {
                ...user,
                isOnline,
                lastSeen,
              }
            : user
        )
      );

      setSelectedUser((previousSelectedUser) => {
        if (
          !previousSelectedUser ||
          previousSelectedUser._id !== userId
        ) {
          return previousSelectedUser;
        }

        return {
          ...previousSelectedUser,
          isOnline,
          lastSeen,
        };
      });
    };
    const profilePictureUpdated = ({
  userId,
  profilePic,
}) => {
  setUsers((previousUsers) =>
    previousUsers.map((user) =>
      user._id === userId
        ? {
            ...user,
            profilePic,
          }
        : user
    )
  );

  setSelectedUser((previousSelectedUser) => {
    if (
      !previousSelectedUser ||
      previousSelectedUser._id !== userId
    ) {
      return previousSelectedUser;
    }

    return {
      ...previousSelectedUser,
      profilePic,
    };
  });

  setCurrentUser((previousCurrentUser) => {
    const currentId =
      previousCurrentUser?.id ||
      previousCurrentUser?._id;

    if (currentId !== userId) {
      return previousCurrentUser;
    }

    const updatedCurrentUser = {
      ...previousCurrentUser,
      profilePic,
    };

    localStorage.setItem(
      "user",
      JSON.stringify(updatedCurrentUser)
    );

    return updatedCurrentUser;
  });
};

    const messageReactionUpdated = ({
      messageId,
      reactions,
    }) => {
      setMessages((previousMessages) =>
        previousMessages.map((item) =>
          item._id === messageId
            ? {
                ...item,
                reactions: Array.isArray(reactions)
                  ? reactions
                  : [],
              }
            : item
        )
      );

      setOpenReactionMenuId(null);
    };

    const reactionError = (error) => {
      alert(error.message || "Failed to update reaction");
    };

    const messageDeleted = ({
      messageId,
      deleteType,
      deletedAt,
      userId,
    }) => {
      if (deleteType === "everyone") {
        setMessages((previousMessages) =>
          previousMessages.map((item) =>
            item._id === messageId
              ? {
                  ...item,
                  isDeletedForEveryone: true,
                  deletedAt,
                  text: "",
                  imageUrl: "",
                }
              : item
          )
        );

        setLastMessages((previousMessages) => {
          const updatedMessages = { ...previousMessages };

          Object.keys(updatedMessages).forEach((chatUserId) => {
            if (updatedMessages[chatUserId]?._id === messageId) {
              updatedMessages[chatUserId] = {
                ...updatedMessages[chatUserId],
                text: "This message was deleted",
                messageType: "deleted",
                imageUrl: "",
                deletedAt,
              };
            }
          });

          return updatedMessages;
        });
      }

      if (
        deleteType === "me" &&
        (!userId || userId === loggedInUserId)
      ) {
        setMessages((previousMessages) =>
          previousMessages.filter(
            (item) => item._id !== messageId
          )
        );
      }

      setOpenDeleteMenuId(null);
      setOpenReactionMenuId(null);
    };

    const deleteMessageError = (error) => {
      alert(error.message || "Failed to delete message");
    };

    const messageError = (error) => {
      alert(error.message || "Message failed");
    };

    socket.on("receiveMessage", receiveMessage);
    socket.on("userTyping", userTyping);
    socket.on(
      "userStoppedTyping",
      userStoppedTyping
    );
    socket.on(
      "userStatusChanged",
      userStatusChanged
    );
    socket.on(
  "profilePictureUpdated",
  profilePictureUpdated
);
    socket.on(
      "messageReactionUpdated",
      messageReactionUpdated
    );
    socket.on("reactionError", reactionError);
    socket.on("messageDeleted", messageDeleted);
    socket.on("deleteMessageError", deleteMessageError);
    socket.on("messageError", messageError);

    return () => {
      socket.off(
        "receiveMessage",
        receiveMessage
      );
      socket.off("userTyping", userTyping);
      socket.off(
        "userStoppedTyping",
        userStoppedTyping
      );
      socket.off(
        "userStatusChanged",
        userStatusChanged
      );
      socket.off(
  "profilePictureUpdated",
  profilePictureUpdated
);
      socket.off(
        "messageReactionUpdated",
        messageReactionUpdated
      );
      socket.off("reactionError", reactionError);
      socket.off("messageDeleted", messageDeleted);
      socket.off("deleteMessageError", deleteMessageError);
      socket.off("messageError", messageError);
    };
  }, [selectedUser, loggedInUserId]);

  const getProfileImageUrl = (profilePic) => {
    if (!profilePic) {
      return "";
    }

    if (
      profilePic.startsWith("http://") ||
      profilePic.startsWith("https://")
    ) {
      return profilePic;
    }

    return `${API_URL}${profilePic}`;
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/auth/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const otherUsers = response.data.filter(
        (user) => user._id !== loggedInUserId
      );

      setUsers(otherUsers);

      const messageRequests = otherUsers.map(
        async (user) => {
          try {
            const messageResponse = await axios.get(
              `${API_URL}/api/messages/${loggedInUserId}/${user._id}`
            );

            const conversation =
              messageResponse.data;

            if (
              Array.isArray(conversation) &&
              conversation.length > 0
            ) {
              const latestMessage =
                conversation[
                  conversation.length - 1
                ];

              const senderId =
                typeof latestMessage.sender ===
                "object"
                  ? latestMessage.sender._id
                  : latestMessage.sender;

              return {
                userId: user._id,
                message: {
                  _id: latestMessage._id,
                  text: latestMessage.text,
                  messageType:
                    latestMessage.messageType || "text",
                  imageUrl:
                    latestMessage.imageUrl || "",
                  createdAt:
                    latestMessage.createdAt,
                  senderId,
                },
              };
            }

            return null;
          } catch (error) {
            console.error(
              `Failed to load messages for ${user.name}:`,
              error
            );

            return null;
          }
        }
      );

      const latestMessageResults =
        await Promise.all(messageRequests);

      const latestMessagesObject = {};

      latestMessageResults.forEach((result) => {
        if (result) {
          latestMessagesObject[result.userId] =
            result.message;
        }
      });

      setLastMessages(latestMessagesObject);
    } catch (error) {
      console.error(
        "Failed to load users:",
        error
      );

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/login";
      }
    }
  };

  const handleProfilePictureClick = () => {
    if (!isUploading) {
      profileInputRef.current?.click();
    }
  };

  const handleProfilePictureChange = async (
    event
  ) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedImageTypes.includes(
        selectedFile.type
      )
    ) {
      alert(
        "Please select a JPG, JPEG, PNG or WEBP image."
      );

      event.target.value = "";
      return;
    }

    const maximumFileSize =
      5 * 1024 * 1024;

    if (
      selectedFile.size > maximumFileSize
    ) {
      alert(
        "Profile picture must be less than 5 MB."
      );

      event.target.value = "";
      return;
    }

    const formData = new FormData();

    formData.append(
      "userId",
      loggedInUserId
    );

    formData.append(
      "profilePic",
      selectedFile
    );

    try {
      setIsUploading(true);

      const response = await axios.post(
        `${API_URL}/api/upload/profile-picture`,
        formData
      );

      const updatedUser = {
        ...currentUser,
        ...response.data.user,
        id:
          response.data.user.id ||
          loggedInUserId,
        profilePic:
          response.data.profilePic,
      };

      setCurrentUser(updatedUser);

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      alert(
        "Profile picture updated successfully."
      );
    } catch (error) {
      console.error(
        "Profile picture upload failed:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to upload profile picture."
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const markMessagesAsSeen = async (
    senderId
  ) => {
    try {
      await axios.patch(
        `${API_URL}/api/messages/seen/update`,
        {
          senderId,
          receiverId: loggedInUserId,
        }
      );
    } catch (error) {
      console.error(
        "Failed to mark messages as seen:",
        error
      );
    }
  };

  const selectUser = async (user) => {
    if (
      selectedUser &&
      typingTimeoutRef.current
    ) {
      clearTimeout(
        typingTimeoutRef.current
      );

      socket.emit("stopTyping", {
        senderId: loggedInUserId,
        receiverId: selectedUser._id,
      });
    }

    setSelectedUser(user);
    setMessages([]);
    setMessage("");
    setIsTyping(false);

    setUnreadCounts((previousCounts) => ({
      ...previousCounts,
      [user._id]: 0,
    }));

    await markMessagesAsSeen(user._id);

    try {
      const response = await axios.get(
        `${API_URL}/api/messages/${loggedInUserId}/${user._id}`
      );

      const conversation = response.data;

      setMessages(conversation);

      if (
        Array.isArray(conversation) &&
        conversation.length > 0
      ) {
        const latestMessage =
          conversation[
            conversation.length - 1
          ];

        const senderId =
          typeof latestMessage.sender ===
          "object"
            ? latestMessage.sender._id
            : latestMessage.sender;

        setLastMessages(
          (previousMessages) => ({
            ...previousMessages,
            [user._id]: {
              _id: latestMessage._id,
              text: latestMessage.text,
              messageType:
                latestMessage.messageType || "text",
              imageUrl:
                latestMessage.imageUrl || "",
              createdAt:
                latestMessage.createdAt,
              senderId,
            },
          })
        );
      }
    } catch (error) {
      console.error(
        "Failed to load messages:",
        error
      );
    }
  };

  const handleMessageChange = (event) => {
    const value = event.target.value;

    setMessage(value);

    if (!selectedUser) {
      return;
    }

    if (value.trim()) {
      socket.emit("typing", {
        senderId: loggedInUserId,
        receiverId: selectedUser._id,
      });
    } else {
      socket.emit("stopTyping", {
        senderId: loggedInUserId,
        receiverId: selectedUser._id,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        socket.emit("stopTyping", {
          senderId: loggedInUserId,
          receiverId: selectedUser._id,
        });
      }, 1000);
  };

  const sendMessage = () => {
    if (!selectedUser) {
      alert("Please select a user first.");
      return;
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    socket.emit("sendMessage", {
      sender: loggedInUserId,
      receiver: selectedUser._id,
      messageType: "text",
      text: trimmedMessage,
      imageUrl: "",
    });

    setLastMessages(
      (previousMessages) => ({
        ...previousMessages,
        [selectedUser._id]: {
          text: trimmedMessage,
          messageType: "text",
          imageUrl: "",
          createdAt:
            new Date().toISOString(),
          senderId: loggedInUserId,
        },
      })
    );

    socket.emit("stopTyping", {
      senderId: loggedInUserId,
      receiverId: selectedUser._id,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    setMessage("");
  };

  const handleChatImageClick = () => {
    if (!selectedUser) {
      alert("Please select a user first.");
      return;
    }

    if (!isSendingImage) {
      chatImageInputRef.current?.click();
    }
  };

  const handleChatImageChange = async (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedUser) {
      alert("Please select a user first.");
      event.target.value = "";
      return;
    }

    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedImageTypes.includes(selectedFile.type)) {
      alert(
        "Please select a JPG, JPEG, PNG, WEBP or GIF image."
      );
      event.target.value = "";
      return;
    }

    const maximumFileSize = 5 * 1024 * 1024;

    if (selectedFile.size > maximumFileSize) {
      alert("Chat image must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      setIsSendingImage(true);

      const response = await axios.post(
        `${API_URL}/api/chat-images/upload`,
        formData
      );

      const imageUrl = response.data.imagePath;

      socket.emit("sendMessage", {
        sender: loggedInUserId,
        receiver: selectedUser._id,
        messageType: "image",
        text: "",
        imageUrl,
      });

      setLastMessages((previousMessages) => ({
        ...previousMessages,
        [selectedUser._id]: {
          text: "",
          messageType: "image",
          imageUrl,
          createdAt: new Date().toISOString(),
          senderId: loggedInUserId,
        },
      }));

      socket.emit("stopTyping", {
        senderId: loggedInUserId,
        receiverId: selectedUser._id,
      });
    } catch (error) {
      console.error("Chat image upload failed:", error);

      alert(
        error.response?.data?.message ||
          "Failed to upload chat image."
      );
    } finally {
      setIsSendingImage(false);
      event.target.value = "";
    }
  };

  const reactToMessage = (item, emoji) => {
    if (!item?._id) {
      alert("Please wait until the message is saved.");
      return;
    }

    if (item.isDeletedForEveryone) {
      return;
    }

    socket.emit("reactToMessage", {
      messageId: item._id,
      userId: loggedInUserId,
      emoji,
    });
  };

  const getGroupedReactions = (reactions = []) => {
    return reactions.reduce((grouped, reaction) => {
      if (!reaction?.emoji) {
        return grouped;
      }

      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = [];
      }

      grouped[reaction.emoji].push(reaction);
      return grouped;
    }, {});
  };

  const deleteMessage = (item, deleteType) => {
    if (!item?._id) {
      alert("Please wait until the message is saved.");
      return;
    }

    const senderId =
      typeof item.sender === "object"
        ? item.sender._id
        : item.sender;

    if (
      deleteType === "everyone" &&
      senderId !== loggedInUserId
    ) {
      alert("Only the sender can delete this message for everyone.");
      return;
    }

    const confirmationText =
      deleteType === "everyone"
        ? "Delete this message for everyone?"
        : "Delete this message only for you?";

    if (!window.confirm(confirmationText)) {
      return;
    }

    socket.emit("deleteMessage", {
      messageId: item._id,
      userId: loggedInUserId,
      deleteType,
    });
  };

  const formatTime = (date) => {
    if (!date) {
      return "";
    }

    const messageDate = new Date(date);

    if (
      Number.isNaN(messageDate.getTime())
    ) {
      return "";
    }

    const today = new Date();

    const isToday =
      messageDate.toDateString() ===
      today.toDateString();

    const yesterday = new Date(today);

    yesterday.setDate(
      today.getDate() - 1
    );

    const isYesterday =
      messageDate.toDateString() ===
      yesterday.toDateString();

    const formattedTime =
      messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    if (isToday) {
      return formattedTime;
    }

    if (isYesterday) {
      return `Yesterday, ${formattedTime}`;
    }

    const formattedDate =
      messageDate.toLocaleDateString([], {
        day: "2-digit",
        month: "short",
      });

    return `${formattedDate}, ${formattedTime}`;
  };

  const formatSidebarTime = (date) => {
    if (!date) {
      return "";
    }

    const messageDate = new Date(date);

    if (
      Number.isNaN(messageDate.getTime())
    ) {
      return "";
    }

    const today = new Date();

    if (
      messageDate.toDateString() ===
      today.toDateString()
    ) {
      return messageDate.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    }

    const yesterday = new Date(today);

    yesterday.setDate(
      today.getDate() - 1
    );

    if (
      messageDate.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Yesterday";
    }

    return messageDate.toLocaleDateString(
      [],
      {
        day: "2-digit",
        month: "short",
      }
    );
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) {
      return "Offline";
    }

    return `Last seen ${formatTime(
      lastSeen
    )}`;
  };

  const getInitial = (name) => {
    if (!name) {
      return "?";
    }

    return name.charAt(0).toUpperCase();
  };

  const getMessagePreview = (
    latestMessage
  ) => {
    if (!latestMessage) {
      return "No messages yet";
    }

    const prefix =
      latestMessage.senderId ===
      loggedInUserId
        ? "You: "
        : "";

    if (latestMessage.messageType === "deleted") {
      return `${prefix}This message was deleted`;
    }

    const maximumLength = 30;

    const text =
      latestMessage.messageType === "image"
        ? "📷 Photo"
        : latestMessage.text || "Message";

    const shortenedText =
      text.length > maximumLength
        ? `${text.substring(
            0,
            maximumLength
          )}...`
        : text;

    return `${prefix}${shortenedText}`;
  };

  const handleLogout = () => {
    if (selectedUser) {
      socket.emit("stopTyping", {
        senderId: loggedInUserId,
        receiverId: selectedUser._id,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    socket.disconnect();

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/login";
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name
        .toLowerCase()
        .includes(
          searchText.toLowerCase()
        )
  );

  const sortedUsers = [
    ...filteredUsers,
  ].sort((firstUser, secondUser) => {
    const firstMessage =
      lastMessages[firstUser._id];

    const secondMessage =
      lastMessages[secondUser._id];

    if (
      !firstMessage &&
      !secondMessage
    ) {
      return 0;
    }

    if (!firstMessage) {
      return 1;
    }

    if (!secondMessage) {
      return -1;
    }

    return (
      new Date(
        secondMessage.createdAt
      ) -
      new Date(firstMessage.createdAt)
    );
  });

  const totalUnreadMessages =
    Object.values(unreadCounts).reduce(
      (total, unreadCount) =>
        total + unreadCount,
      0
    );

  return (
    <div className="chat-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="current-user">
            <div
              className="avatar"
              style={{
                position: "relative",
                overflow: "visible",
              }}
            >
              {currentUser?.profilePic ? (
                <img
  src={getProfileImageUrl(currentUser.profilePic)}
  alt={currentUser.name}
  style={{
    width: "52px",
    height: "52px",
    minWidth: "52px",
    maxWidth: "52px",
    minHeight: "52px",
    maxHeight: "52px",
    borderRadius: "50%",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
  }}
/>) : (
                <span>
                  {getInitial(
                    currentUser?.name
                  )}
                </span>
              )}

              <span className="online-dot" />

              <button
                type="button"
                onClick={
                  handleProfilePictureClick
                }
                disabled={isUploading}
                title="Change profile picture"
                style={{
                  position: "absolute",
                  right: "-5px",
                  bottom: "-5px",
                  width: "24px",
                  height: "24px",
                  padding: 0,
                  border: "2px solid white",
                  borderRadius: "50%",
                  background: "#128c7e",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isUploading
                    ? "not-allowed"
                    : "pointer",
                  fontSize: "11px",
                  zIndex: 5,
                }}
              >
                <FaCamera />
              </button>

              <input
                ref={profileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={
                  handleProfilePictureChange
                }
                style={{
                  display: "none",
                }}
              />
            </div>

            <div className="current-user-info">
              <h3>{currentUser?.name}</h3>

              <p>
                {isUploading
                  ? "Uploading..."
                  : "Online"}
              </p>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
            title="Logout"
          >
            <FaSignOutAlt />
          </button>
        </div>

        <div className="search-container">
          <FaSearch className="search-icon" />

          <input
            type="text"
            placeholder="Search users..."
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
          />
        </div>

        <div className="sidebar-title">
          <h2>Chats</h2>

          <span
            title={`${totalUnreadMessages} unread messages`}
          >
            {totalUnreadMessages > 99
              ? "99+"
              : totalUnreadMessages}
          </span>
        </div>

        <div className="user-list">
          {sortedUsers.length === 0 ? (
            <div className="empty-users">
              No users found
            </div>
          ) : (
            sortedUsers.map((user) => {
              const unreadCount =
                unreadCounts[user._id] || 0;

              const latestMessage =
                lastMessages[user._id];

              return (
                <div
                  key={user._id}
                  className={`user-item ${
                    selectedUser?._id ===
                    user._id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    selectUser(user)
                  }
                >
                  <div className="avatar">
                    {user.profilePic ? (
                      <img
                        src={getProfileImageUrl(
                          user.profilePic
                        )}
                        alt={user.name}
                      />
                    ) : (
                      <span>
                        {getInitial(
                          user.name
                        )}
                      </span>
                    )}

                    <span
                      className={
                        user.isOnline
                          ? "online-dot"
                          : "offline-dot"
                      }
                    />
                  </div>

                  <div className="user-details">
                    <div className="user-name-row">
                      <h4>{user.name}</h4>

                      <span
                        style={{
                          marginLeft: "8px",
                          color:
                            unreadCount > 0
                              ? "#128c7e"
                              : "#667781",
                          fontSize: "10px",
                          fontWeight:
                            unreadCount > 0
                              ? "700"
                              : "400",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatSidebarTime(
                          latestMessage?.createdAt
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: "5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "space-between",
                        gap: "8px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          flex: 1,
                          minWidth: 0,
                          color:
                            unreadCount > 0
                              ? "#111b21"
                              : "#667781",
                          fontWeight:
                            unreadCount > 0
                              ? "700"
                              : "400",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow:
                            "ellipsis",
                        }}
                      >
                        {getMessagePreview(
                          latestMessage
                        )}
                      </p>

                      {unreadCount > 0 && (
                        <span
                          style={{
                            minWidth: "22px",
                            height: "22px",
                            padding: "0 6px",
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            borderRadius:
                              "12px",
                            background:
                              "#25d366",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: "700",
                            flexShrink: 0,
                          }}
                        >
                          {unreadCount > 99
                            ? "99+"
                            : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      <main className="chat-window">
        <div className="chat-header">
          {selectedUser ? (
            <div className="selected-user-info">
              <div className="avatar">
                {selectedUser.profilePic ? (
                  <img
                    src={getProfileImageUrl(
                      selectedUser.profilePic
                    )}
                    alt={selectedUser.name}
                  />
                ) : (
                  <span>
                    {getInitial(
                      selectedUser.name
                    )}
                  </span>
                )}

                <span
                  className={
                    selectedUser.isOnline
                      ? "online-dot"
                      : "offline-dot"
                  }
                />
              </div>

              <div>
                <h3>
                  {selectedUser.name}
                </h3>

                {isTyping ? (
                  <p className="typing-text">
                    typing...
                  </p>
                ) : (
                  <p>
                    {selectedUser.isOnline
                      ? "Online"
                      : formatLastSeen(
                          selectedUser.lastSeen
                        )}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3>Real-Time Chat</h3>
              <p>
                Select a user to start
                chatting
              </p>
            </div>
          )}
        </div>

        <div className="messages">
          {!selectedUser ? (
            <div className="welcome-message">
              <div className="welcome-icon">
                💬
              </div>

              <h2>
                Welcome to Real-Time Chat
              </h2>

              <p>
                Select a user from the
                sidebar to start a
                conversation.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="no-messages">
              <p>
                No messages yet. Start the
                conversation!
              </p>
            </div>
          ) : (
            messages.map(
              (item, index) => {
                const senderId =
                  typeof item.sender ===
                  "object"
                    ? item.sender._id
                    : item.sender;

                const isSentMessage =
                  senderId ===
                  loggedInUserId;

                return (
                  <div
                    key={
                      item._id || index
                    }
                    className={`message-row ${
                      isSentMessage
                        ? "sent-row"
                        : "received-row"
                    }`}
                  >
                    <div
                      className={`message ${
                        isSentMessage
                          ? "sent"
                          : "received"
                      }`}
                      style={{ position: "relative" }}
                    >
                      {!item.isDeletedForEveryone && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenDeleteMenuId(
                              openDeleteMenuId === item._id
                                ? null
                                : item._id
                            );
                            setOpenReactionMenuId(null);
                          }}
                          title="Message options"
                          style={{
                            position: "absolute",
                            top: "5px",
                            right: "5px",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: "4px",
                            opacity: 0.7,
                            zIndex: 2,
                          }}
                        >
                          <FaEllipsisV />
                        </button>
                      )}

                      {openDeleteMenuId === item._id &&
                        !item.isDeletedForEveryone && (
                          <div
                            style={{
                              position: "absolute",
                              top: "30px",
                              right: "8px",
                              minWidth: "165px",
                              background: "white",
                              borderRadius: "8px",
                              boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                              overflow: "hidden",
                              zIndex: 10,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                deleteMessage(item, "me")
                              }
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "none",
                                background: "white",
                                textAlign: "left",
                                cursor: "pointer",
                              }}
                            >
                              Delete for me
                            </button>

                            {isSentMessage && (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteMessage(item, "everyone")
                                }
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  border: "none",
                                  background: "white",
                                  textAlign: "left",
                                  cursor: "pointer",
                                }}
                              >
                                Delete for everyone
                              </button>
                            )}
                          </div>
                        )}

                      {item.isDeletedForEveryone ? (
                        <p style={{ fontStyle: "italic", opacity: 0.75 }}>
                          This message was deleted
                        </p>
                      ) : item.messageType === "image" &&
                        item.imageUrl ? (
                        <img
                          src={getProfileImageUrl(
                            item.imageUrl
                          )}
                          alt="Chat attachment"
                          style={{
                            width: "100%",
                            maxWidth: "280px",
                            maxHeight: "320px",
                            objectFit: "cover",
                            borderRadius: "10px",
                            display: "block",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            window.open(
                              getProfileImageUrl(
                                item.imageUrl
                              ),
                              "_blank"
                            )
                          }
                        />
                      ) : (
                        <p>{item.text}</p>
                      )}

                      {!item.isDeletedForEveryone && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenReactionMenuId(
                                openReactionMenuId === item._id
                                  ? null
                                  : item._id
                              );
                              setOpenDeleteMenuId(null);
                            }}
                            title="React to message"
                            style={{
                              position: "absolute",
                              bottom: "-11px",
                              left: isSentMessage
                                ? "-18px"
                                : "auto",
                              right: isSentMessage
                                ? "auto"
                                : "-18px",
                              width: "28px",
                              height: "28px",
                              border: "1px solid #d7d7d7",
                              borderRadius: "50%",
                              background: "#ffffff",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 4,
                            }}
                          >
                            😊
                          </button>

                          {openReactionMenuId === item._id && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: "-48px",
                                left: isSentMessage
                                  ? "auto"
                                  : "0",
                                right: isSentMessage
                                  ? "0"
                                  : "auto",
                                display: "flex",
                                gap: "4px",
                                padding: "7px 9px",
                                borderRadius: "22px",
                                background: "#ffffff",
                                boxShadow:
                                  "0 4px 14px rgba(0,0,0,0.2)",
                                zIndex: 20,
                              }}
                            >
                              {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(
                                (emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() =>
                                      reactToMessage(item, emoji)
                                    }
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      fontSize: "20px",
                                      cursor: "pointer",
                                      padding: "2px",
                                    }}
                                  >
                                    {emoji}
                                  </button>
                                )
                              )}
                            </div>
                          )}

                          {Object.keys(
                            getGroupedReactions(item.reactions)
                          ).length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px",
                                marginTop: "7px",
                                paddingRight: "18px",
                              }}
                            >
                              {Object.entries(
                                getGroupedReactions(item.reactions)
                              ).map(([emoji, reactionList]) => {
                                const currentUserReacted =
                                  reactionList.some((reaction) => {
                                    const reactionUserId =
                                      typeof reaction.user === "object"
                                        ? reaction.user._id
                                        : reaction.user;

                                    return (
                                      reactionUserId === loggedInUserId
                                    );
                                  });

                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() =>
                                      reactToMessage(item, emoji)
                                    }
                                    title={
                                      currentUserReacted
                                        ? "Click to remove your reaction"
                                        : "React with this emoji"
                                    }
                                    style={{
                                      border: currentUserReacted
                                        ? "1px solid #128c7e"
                                        : "1px solid #d9d9d9",
                                      borderRadius: "14px",
                                      background: currentUserReacted
                                        ? "#d9fdd3"
                                        : "#ffffff",
                                      padding: "2px 7px",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {emoji} {reactionList.length}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}

                      <small>
                        {formatTime(
                          item.createdAt
                        )}
                      </small>
                    </div>
                  </div>
                );
              }
            )
          )}

          {selectedUser && isTyping && (
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="message-input">
          <button
            type="button"
            onClick={handleChatImageClick}
            disabled={!selectedUser || isSendingImage}
            title={
              isSendingImage
                ? "Uploading image..."
                : "Attach image"
            }
            style={{
              flexShrink: 0,
            }}
          >
            <FaPaperclip />
          </button>

          <input
            ref={chatImageInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
            onChange={handleChatImageChange}
            style={{ display: "none" }}
          />

          <input
            type="text"
            placeholder={
              selectedUser
                ? isSendingImage
                  ? "Uploading image..."
                  : "Type a message..."
                : "Select a user first"
            }
            value={message}
            disabled={!selectedUser || isSendingImage}
            onChange={handleMessageChange}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                sendMessage();
              }
            }}
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={
              !selectedUser ||
              isSendingImage ||
              !message.trim()
            }
            title="Send message"
          >
            <FaPaperPlane />
          </button>
        </div>
      </main>
    </div>
  );
}

export default Chat;