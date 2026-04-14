import api from "./authService";

export const blockService = {
  getBlockedUsers: (page = 1, limit = 20) =>
    api.get("/users/blocked", { params: { page, limit } }),

  blockUser: (targetId) =>
    api.put(`/users/${targetId}/block`, { action: "block" }),

  unblockUser: (targetId) =>
    api.put(`/users/${targetId}/block`, { action: "unblock" }),
};
