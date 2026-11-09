export function useSuppliers() {
  return { loading: false, suppliers: [], error: null, refresh: async () => undefined };
}
