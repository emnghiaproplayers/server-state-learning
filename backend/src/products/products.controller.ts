import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getProducts(
    @Query(new ValidationPipe({ transform: true })) query: GetProductsQueryDto,
  ) {
    const cursor = query.cursor ?? 0;
    const limit = query.limit ?? 5;
    return this.productsService.getProducts(cursor, limit);
  }
}
