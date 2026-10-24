package dev.calebtetteh.catalog;

import java.util.Collection;

import jakarta.validation.constraints.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Read-only product API. Path variables are validated by Spring MVC's built-in
 * method validation, so malformed IDs get a 400 instead of reaching the repository.
 */
@RestController
public class ProductController {

    private final ProductRepository repository;

    public ProductController(ProductRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/products")
    public Collection<Product> list() {
        return repository.findAll();
    }

    @GetMapping("/products/{id}")
    public Product get(@PathVariable @Pattern(regexp = "^[a-z0-9-]{1,40}$") String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown product"));
    }
}
