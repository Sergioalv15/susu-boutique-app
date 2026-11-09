export interface Supplier {
  id: number;
  name: string;
  phone: string;
  notes: string;
  createdAt: string;
}

export interface NewSupplier {
  name: string;
  phone: string;
  notes: string;
}

export type SupplierFormValues = Omit<NewSupplier, ''> & {
  name: string;
  phone: string;
  notes: string;
};