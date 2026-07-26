export interface Product {
  id: number;
  name: string;
  price: number;
}

export interface ProductsPageResponse {
  data: Product[];
  nextCursor: number | null;
}
