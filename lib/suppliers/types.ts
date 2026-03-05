export interface SupplierProduct {
  id: string;
  name: string;
  price: string;
  amount: number;
  description: string;
  min: string;
  max: string;
  categoryId?: string;
  categoryName?: string;
}

export interface SupplierCategory {
  id: string;
  name: string;
  icon?: string;
  products: SupplierProduct[];
}

export interface SupplierProductsResponse {
  status: string;
  categories: SupplierCategory[];
}

export interface SupplierPurchaseResponse {
  status: string;
  msg?: string;
  trans_id?: string;
  data?: string[];
}
