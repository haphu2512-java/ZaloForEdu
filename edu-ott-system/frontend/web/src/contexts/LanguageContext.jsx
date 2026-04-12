import { createContext, useContext, useState, useCallback } from "react";

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
    searchPlaceholder: "Tìm kiếm...",
    noConversations: "Không có hội thoại nào",
    selectConversation: "Vui lòng chọn một cuộc trò chuyện để bắt đầu",
    typeMessage: "Nhập tin nhắn...",
    members: "Thành viên",
    groupInfo: "Thông tin nhóm",
    cloudStorage: "Dung lượng",
    cleanupBtn: "Xem và dọn dẹp My Documents",
    upgradeTitle: "Nâng cấp dung lượng My Documents",
    upgradeDesc: "Mở rộng lên đến 100GB. Đồng bộ dữ liệu vĩnh viễn với zCloud.",
    upgradeBtn: "Thêm dung lượng",
    onCloud: "Đã có trên Cloud",

    // Contacts
    contactsTitle: "Danh bạ",
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
    searchPlaceholder: "Search...",
    noConversations: "No conversations",
    selectConversation: "Please select a conversation to start",
    typeMessage: "Type a message...",
    members: "Members",
    groupInfo: "Group Info",
    cloudStorage: "Storage",
    cleanupBtn: "View & Clean My Documents",
    upgradeTitle: "Upgrade My Documents Storage",
    upgradeDesc: "Expand up to 100GB. Sync data permanently with zCloud.",
    upgradeBtn: "Add Storage",
    onCloud: "Available on Cloud",

    // Contacts
    contactsTitle: "Contacts",
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
  const [language, setLanguage] = useState(
    () => localStorage.getItem("app-language") || "vi"
  );

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang);
    localStorage.setItem("app-language", lang);
    document.documentElement.setAttribute("lang", lang);
  }, []);

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
