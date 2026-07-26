import { Injectable, Logger } from '@nestjs/common';
import { Product, ProductsPageResponse } from './interfaces/product.interface';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly products: Product[] = [];

  constructor() {
    // Seed 25 products to support at least 5 pages when limit=5
    for (let i = 1; i <= 25; i++) {
      this.products.push({
        id: i,
        name: `Product ${i} - Premium item #${i}`,
        price: Math.floor(10 + i * 5.5),
      });
    }
  }

  getProducts(cursor: number = 0, limit: number = 5): ProductsPageResponse {
    this.logger.log(`Fetching products page: cursor=${cursor}, limit=${limit}`);

    const start = Math.max(0, cursor);
    const end = start + limit;

    const data = this.products.slice(start, end);
    const nextCursor = end < this.products.length ? end : null;

    return {
      data,
      nextCursor,
    };
  }
}
