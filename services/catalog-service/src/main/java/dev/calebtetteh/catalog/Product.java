package dev.calebtetteh.catalog;

/**
 * A catalog product. Prices are integer cents to avoid floating-point rounding.
 */
public record Product(String id, String name, long priceCents, boolean inStock) {
}
