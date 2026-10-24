package dev.calebtetteh.catalog;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Repository;

/**
 * In-memory, read-only catalog. Keeps the demo self-contained; a real service
 * would back this with DynamoDB or RDS behind the same interface.
 */
@Repository
public class ProductRepository {

    private final Map<String, Product> products = new LinkedHashMap<>();

    public ProductRepository() {
        add(new Product("p-100", "Mechanical keyboard", 4999, true));
        add(new Product("p-200", "27-inch monitor", 18999, false));
        add(new Product("p-300", "USB-C dock", 8999, true));
        add(new Product("p-400", "Noise-cancelling headset", 12999, true));
        add(new Product("p-500", "Laptop stand", 2999, true));
    }

    private void add(Product product) {
        products.put(product.id(), product);
    }

    public Collection<Product> findAll() {
        return products.values();
    }

    public Optional<Product> findById(String id) {
        return Optional.ofNullable(products.get(id));
    }
}
