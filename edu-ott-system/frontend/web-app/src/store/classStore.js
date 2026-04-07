import { create } from "zustand";
import { classService } from "../services/classService";

export const useClassStore = create((set, get) => ({
  classes: [],
  activeClass: null,
  isLoading: false,
  error: null,

  // Lấy danh sách lớp
  fetchClasses: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await classService.getAll();
      set({ classes: res.data.classes || [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.response?.data?.message });
    }
  },

  // Lấy chi tiết lớp
  fetchClassById: async (id) => {
    set({ isLoading: true });
    try {
      const res = await classService.getById(id);
      set({ activeClass: res.data.class, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.response?.data?.message });
    }
  },

  // Tạo lớp mới
  createClass: async (data) => {
    try {
      const res = await classService.create(data);
      const newClass = res.data.class;
      set((state) => ({ classes: [newClass, ...state.classes] }));
      return { success: true, class: newClass };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  },

  // Join lớp
  joinClass: async (code) => {
    try {
      await classService.joinByCode(code);
      get().fetchClasses();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  },

  setActiveClass: (cls) => set({ activeClass: cls }),
  clearError: () => set({ error: null }),
}));
