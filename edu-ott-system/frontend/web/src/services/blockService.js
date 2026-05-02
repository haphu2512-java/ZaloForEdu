import api from "./authService";

// Backend route: POST /users/block/:id  (body: { action: 'block' | 'unblock' })
export const blockService = {
  getBlockedUsers: () =>
    api.get("/users/me/blocked"),

  blockUser: (targetId) =>
    api.post(`/users/block/${targetId}`, { action: "block" }),

  unblockUser: (targetId) =>
    api.post(`/users/block/${targetId}`, { action: "unblock" }),
};
