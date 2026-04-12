import { useState } from "react";
import { FaUserFriends, FaUsers, FaUserPlus, FaSearch } from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";
import "./ContactsPage.css";

export default function ContactsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("friends");

  return (
    <div className="contacts-page">
      {/* ── SIDEBAR ── */}
      <div className="contacts-sidebar">
        <div className="cs-header">
          <span className="cs-title">{t("contactsTitle")}</span>
          <button className="cs-add-btn" title={t("addFriend")}>
            <FaUserPlus size={15} />
          </button>
        </div>

        <div className="cs-search">
          <FaSearch size={14} color="var(--text-tertiary)" />
          <input placeholder={t("searchFriends")} />
        </div>

        <div className="cs-menu">
          <div
            className={`cs-menu-item ${activeTab === "friends" ? "active" : ""}`}
            onClick={() => setActiveTab("friends")}
          >
            <div className="cs-icon friends"><FaUserFriends size={18} /></div>
            {t("friendList")}
          </div>
          <div
            className={`cs-menu-item ${activeTab === "groups" ? "active" : ""}`}
            onClick={() => setActiveTab("groups")}
          >
            <div className="cs-icon groups"><FaUsers size={18} /></div>
            {t("groupList")}
          </div>
          <div
            className={`cs-menu-item ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            <div className="cs-icon requests"><FaUserPlus size={18} /></div>
            {t("friendRequests")}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="contacts-main">
        {activeTab === "friends" && (
          <div className="contacts-placeholder">
            <img
              src="https://chat.zalo.me/assets/inapp-welcome-screen-04.png"
              alt="friends"
              className="contacts-illustration"
            />
            <h3>{t("emptyFriends")}</h3>
            <p>{t("emptyFriendsDesc")}</p>
            <button className="contacts-btn">{t("addFriendBtn")}</button>
          </div>
        )}

        {activeTab === "groups" && (
          <div className="contacts-placeholder">
            <img
              src="https://chat.zalo.me/assets/inapp-welcome-screen-04.png"
              alt="groups"
              className="contacts-illustration"
              style={{ filter: "hue-rotate(120deg)" }}
            />
            <h3>{t("emptyGroups")}</h3>
            <p>{t("emptyGroupsDesc")}</p>
            <button className="contacts-btn">{t("createGroup")}</button>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="contacts-placeholder">
            <img
              src="https://chat.zalo.me/assets/inapp-welcome-screen-04.png"
              alt="requests"
              className="contacts-illustration"
              style={{ filter: "hue-rotate(60deg)" }}
            />
            <h3>{t("emptyRequests")}</h3>
            <p>{t("emptyRequestsDesc")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
