import { create } from 'zustand';
import { listDoc, getDoc, createDoc, updateDoc, deleteDoc } from '../api/frappe';

const useClientStore = create((set, get) => ({
  clients: [],
  currentClient: null,
  isLoading: false,
  error: null,
  total: 0,
  pageLength: 20,
  currentPage: 1,

  fetchClients: async (filters = {}, start = 0, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const filtersJSON = JSON.stringify(filters);
      const { data } = await listDoc('Sales Invoice', {
        filters: filtersJSON,
        limit_page_length: limit,
        start,
        order_by: 'creation desc',
      });
      set({
        clients: data.data || [],
        total: data.total || 0,
        isLoading: false,
      });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchClient: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await getDoc('Customer', name);
      set({ currentClient: data.data, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  createClient: async (data) => {
    try {
      const { data: result } = await createDoc('Customer', data);
      set((state) => ({ clients: [result.data, ...state.clients] }));
      return result.data;
    } catch (err) {
      throw err;
    }
  },

  updateClient: async (name, data) => {
    try {
      const { data: result } = await updateDoc('Customer', name, data);
      set((state) => ({
        clients: state.clients.map((c) => (c.name === name ? result.data : c)),
        currentClient: result.data,
      }));
      return result.data;
    } catch (err) {
      throw err;
    }
  },

  deleteClient: async (name) => {
    try {
      await deleteDoc('Customer', name);
      set((state) => ({
        clients: state.clients.filter((c) => c.name !== name),
      }));
    } catch (err) {
      throw err;
    }
  },

  setCurrentClient: (client) => set({ currentClient: client }),
  setPage: (page) => set({ currentPage: page }),
}));

export default useClientStore;
