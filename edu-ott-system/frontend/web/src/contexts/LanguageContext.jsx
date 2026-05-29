import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";

// ─── Bản dịch ───────────────────────────────────────────────────────────────
const translations = {
  vi: {
    // Nav
    messages: "Tin nhắn",
    contacts: "Danh bạ",
    aiBot: "AI Bot",
    myDocuments: "Tài liệu của tôi",
    profile: "Hồ sơ",

    // Avatar menu
    accountInfo: "Thông tin tài khoản",
    settings: "Cài đặt",
    online: "🟢 Đang hoạt động",
    logout: "Đăng xuất",

    // Settings modal
    settingsTitle: "Cài đặt",
    tabGeneral: "Cài đặt chung",
    tabSecurity: "Tài khoản và bảo mật",
    tabData: "Quản lý dữ liệu",
    tabLanguage: "Ngôn ngữ",
    tabSupport: "Hỗ trợ",

    // General tab
    appearance: "Giao diện",
    themeLight: "Sáng",
    themeDark: "Tối",
    themeSystem: "Hệ thống (Theo giờ)",
    notifications: "Thông báo",
    enableNotifs: "Bật thông báo tin nhắn",
    languageLabel: "Ngôn ngữ",
    changeLanguage: "Thay đổi ngôn ngữ",

    // Security tab
    securityTitle: "Tài khoản và bảo mật",
    securityDesc: "Quản lý mật khẩu, xác thực 2 yếu tố và các thiết bị đã đăng nhập.",
    changePassword: "Đổi mật khẩu",

    // Data tab
    dataTitle: "Quản lý dữ liệu",
    dataDesc: "Xoá lịch sử trò chuyện, quản lý bộ nhớ đệm.",
    clearHistory: "Xoá toàn bộ lịch sử",

    // Languages tab
    displayLanguage: "Ngôn ngữ hiển thị",
    selectLanguage: "Chọn ngôn ngữ",

    // Support tab
    supportTitle: "Hỗ trợ",
    supportDesc: "Nếu gặp vấn đề, vui lòng liên hệ nhóm hỗ trợ.",
    sendFeedback: "Gửi phản hồi",

    // Chat
    allTab: "Tất cả",
    groupTab: "Nhóm",
    directTab: "1-1",
    noteTab: "Ghi chú",
    primaryTab: "Chính",
    workTab: "Việc",
    familyTab: "G.đình",
    otherTab: "Khác",
    searchPlaceholder: "Tìm kiếm...",
    searchFriendsPlace: "Tìm bạn bè, số điện thoại...",
    noConversations: "Không có hội thoại nào",
    selectConversation: "Vui lòng chọn một cuộc trò chuyện để bắt đầu",
    typeMessage: "Nhập tin nhắn...",
    noMessages: "Chưa có tin nhắn",
    recalledMessage: "Tin nhắn đã thu hồi",
    imageVideo: "Ảnh/Video",
    noImageVideo: "Chưa có Ảnh/Video nào",
    members: "Thành viên",
    groupInfo: "Thông tin nhóm",
    groupManage: "Quản lý nhóm",
    groupMembers: "Thành viên nhóm",
    groupOwner: "Trưởng nhóm",
    groupAdmin: "Phó nhóm",
    remindersList: "Danh sách nhắc hẹn",
    pinnedMessages: "Tin nhắn đã ghim",
    polls: "Bình chọn",
    files: "File",
    links: "Link",
    pin: "Ghim",
    addMember: "Thêm TV",
    manage: "Quản lý",
    unmute: "Bật TB",
    mute: "Tắt TB",
    cloudStorage: "Dung lượng",
    cleanupBtn: "Xem và dọn dẹp My Documents",
    upgradeTitle: "Nâng cấp dung lượng My Documents",
    upgradeDesc: "Mở rộng lên đến 100GB. Đồng bộ dữ liệu vĩnh viễn với zCloud.",
    upgradeBtn: "Thêm dung lượng",
    onCloud: "Đã có trên Cloud",

    // Contacts
    contactsTitle: "Danh bạ",
    friendsTab: "Bạn bè",
    groupsTab: "Nhóm",
    requestsTab: "Lời mời",
    sentTab: "Đã gửi",
    addFriend: "Thêm bạn bè",
    searchFriends: "Tìm bạn bè, nhóm...",
    friendList: "Danh sách bạn bè",
    groupList: "Danh sách nhóm",
    friendRequests: "Lời mời kết bạn",
    emptyFriends: "Danh sách bạn bè rỗng",
    emptyFriendsDesc: "Hãy tìm kiếm bạn bè bằng số điện thoại để bắt đầu trò chuyện.",
    addFriendBtn: "Thêm bạn ngay",
    emptyGroups: "Chưa có nhóm nào",
    emptyGroupsDesc: "Trò chuyện cùng lúc với nhiều người hơn bằng cách tạo nhóm mới.",
    createGroup: "Tạo nhóm mới",
    emptyRequests: "Không có lời mời kết bạn nào",
    emptyRequestsDesc: "Khi có người gửi lời mời, danh sách sẽ hiển thị ở đây.",

    // Chatbot
    chatbotName: "ZaloAI - Trợ lý Học tập",
    chatbotStatus: "Luôn sẵn sàng hỗ trợ",
    chatbotToday: "Hôm nay",
    chatbotWelcome: "Chào bạn! 👋 Mình là ZaloAI, trợ lý cá nhân đa năng của bạn do sinh viên IUH tạo ra.",
    chatbotDesc: "Mục này đang được phát triển backend. Ở các phiên bản sau, mình có thể giúp bạn giải toán, dịch văn bản, và tìm kiếm tài liệu nhanh qua ZaloApp.",
    chatbotPlaceholder: "Nhập câu hỏi của bạn tại đây (Tính năng đang bảo trì)...",

    // Profile
    profileGroups: "nhóm",
    profileCourses: "môn học",
    profileJoined: "Tham gia",
    roleStudent: "Sinh viên",
    roleTeacher: "Giảng viên",
    notUpdated: "Chưa cập nhật",
    noBio: "Chưa có giới thiệu bản thân.",
    contactInfo: "Thông tin liên hệ & Cơ bản",
    emailLabel: "Địa chỉ Email",
    phoneLabel: "Số điện thoại",
    dobLabel: "Ngày sinh",
    deptLabel: "Phòng ban / Khoa",
    menuAccount: "Tài khoản",
    menuMyProfile: "Hồ sơ của tôi",
    menuEditProfile: "Chỉnh sửa hồ sơ",
    menuChangeAvatar: "Đổi ảnh đại diện",
    menuChangePassword: "Đổi mật khẩu",
    menuOther: "Khác",
    menuNotifications: "Thông báo",
    menuPrivacy: "Quyền riêng tư",
    menuAbout: "Về ứng dụng",
    defaultLocation: "Hồ Chí Minh, VN",
    defaultSkills: "Giao tiếp, Làm việc nhóm, Tiếng Anh",
  },

  en: {
    // Nav
    messages: "Messages",
    contacts: "Contacts",
    aiBot: "AI Bot",
    myDocuments: "My Documents",
    profile: "Profile",

    // Avatar menu
    accountInfo: "Account Info",
    settings: "Settings",
    online: "🟢 Online",
    logout: "Log out",

    // Settings modal
    settingsTitle: "Settings",
    tabGeneral: "General",
    tabSecurity: "Account & Security",
    tabData: "Data Management",
    tabLanguage: "Language",
    tabSupport: "Support",

    // General tab
    appearance: "Appearance",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System (Time-based)",
    notifications: "Notifications",
    enableNotifs: "Enable message notifications",
    languageLabel: "Language",
    changeLanguage: "Change language",

    // Security tab
    securityTitle: "Account & Security",
    securityDesc: "Manage password, two-factor authentication and logged-in devices.",
    changePassword: "Change Password",

    // Data tab
    dataTitle: "Data Management",
    dataDesc: "Delete chat history, manage cache.",
    clearHistory: "Clear All History",

    // Languages tab
    displayLanguage: "Display Language",
    selectLanguage: "Select language",

    // Support tab
    supportTitle: "Support",
    supportDesc: "If you encounter issues, please contact the support team.",
    sendFeedback: "Send Feedback",

    // Chat
    allTab: "All",
    groupTab: "Group",
    directTab: "1-1",
    noteTab: "Notes",
    primaryTab: "Primary",
    workTab: "Work",
    familyTab: "Family",
    otherTab: "Other",
    searchPlaceholder: "Search...",
    searchFriendsPlace: "Search friends, phone...",
    noConversations: "No conversations",
    selectConversation: "Please select a conversation to start",
    typeMessage: "Type a message...",
    noMessages: "No messages yet",
    recalledMessage: "Message was recalled",
    imageVideo: "Images/Videos",
    noImageVideo: "No images/videos yet",
    members: "Members",
    groupInfo: "Group Info",
    groupManage: "Manage Group",
    groupMembers: "Group Members",
    groupOwner: "Group Owner",
    groupAdmin: "Group Admin",
    remindersList: "Reminders List",
    pinnedMessages: "Pinned Messages",
    polls: "Polls",
    files: "Files",
    links: "Links",
    pin: "Pin",
    addMember: "Add Member",
    manage: "Manage",
    unmute: "Unmute",
    mute: "Mute",
    cloudStorage: "Storage",
    cleanupBtn: "View & Clean My Documents",
    upgradeTitle: "Upgrade My Documents Storage",
    upgradeDesc: "Expand up to 100GB. Sync data permanently with zCloud.",
    upgradeBtn: "Add Storage",
    onCloud: "Available on Cloud",

    // Contacts
    contactsTitle: "Contacts",
    friendsTab: "Friends",
    groupsTab: "Groups",
    requestsTab: "Requests",
    sentTab: "Sent",
    addFriend: "Add Friend",
    searchFriends: "Search friends, groups...",
    friendList: "Friend List",
    groupList: "Group List",
    friendRequests: "Friend Requests",
    emptyFriends: "No friends yet",
    emptyFriendsDesc: "Search for friends by phone number to start chatting.",
    addFriendBtn: "Add Friend Now",
    emptyGroups: "No groups yet",
    emptyGroupsDesc: "Chat with multiple people by creating a new group with friends.",
    createGroup: "Create New Group",
    emptyRequests: "No friend requests",
    emptyRequestsDesc: "When someone sends you a request, it will appear here.",

    // Chatbot
    chatbotName: "ZaloAI - Learning Assistant",
    chatbotStatus: "Always ready to help",
    chatbotToday: "Today",
    chatbotWelcome: "Hello! 👋 I'm ZaloAI, your personal assistant created by IUH students.",
    chatbotDesc: "Backend is under development. In future versions, I can help you solve math problems, translate text, and search documents quickly.",
    chatbotPlaceholder: "Enter your question here (Feature under maintenance)...",

    // Profile
    profileGroups: "groups",
    profileCourses: "courses",
    profileJoined: "Joined",
    roleStudent: "Student",
    roleTeacher: "Lecturer",
    notUpdated: "Not updated",
    noBio: "No bio yet.",
    contactInfo: "Contact & Basic Information",
    emailLabel: "Email Address",
    phoneLabel: "Phone Number",
    dobLabel: "Date of Birth",
    deptLabel: "Department / Faculty",
    menuAccount: "Account",
    menuMyProfile: "My Profile",
    menuEditProfile: "Edit Profile",
    menuChangeAvatar: "Change Avatar",
    menuChangePassword: "Change Password",
    menuOther: "Other",
    menuNotifications: "Notifications",
    menuPrivacy: "Privacy",
    menuAbout: "About",
    defaultLocation: "Ho Chi Minh, VN",
    defaultSkills: "Communication, Teamwork, English",
  },
};

// ─── Context ─────────────────────────────────────────────────────────────────
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Khởi tạo: đọc ngôn ngữ của user hiện tại nếu có, fallback về 'vi'
    try {
      const savedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (savedUser?._id) {
        return localStorage.getItem(`app-language-${savedUser._id}`) || "vi";
      }
    } catch (_) {}
    return "vi";
  });

  const applyLanguage = useCallback((lang) => {
    setLanguage(lang);
    document.documentElement.setAttribute("lang", lang);
  }, []);

  // Lắng nghe window events từ authStore (đáng tin cậy hơn Zustand selector trong mọi tình huống)
  useEffect(() => {
    const handleLogout = () => {
      // Logout → về tiếng Việt
      applyLanguage("vi");
    };

    const handleLogin = () => {
      // Login → restore ngôn ngữ đã lưu của user này
      const uid = useAuthStore.getState().user?._id;
      if (uid) {
        const saved = localStorage.getItem(`app-language-${uid}`);
        applyLanguage(saved || "vi");
      }
    };

    window.addEventListener("user-logout", handleLogout);
    window.addEventListener("user-login", handleLogin);
    return () => {
      window.removeEventListener("user-logout", handleLogout);
      window.removeEventListener("user-login", handleLogin);
    };
  }, [applyLanguage]);

  const changeLanguage = useCallback((lang) => {
    applyLanguage(lang);
    const user = useAuthStore.getState().user;
    if (user?._id) {
      localStorage.setItem(`app-language-${user._id}`, lang);
    }
  }, [applyLanguage]);

  const t = useCallback(
    (key) => translations[language]?.[key] ?? translations["vi"][key] ?? key,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
