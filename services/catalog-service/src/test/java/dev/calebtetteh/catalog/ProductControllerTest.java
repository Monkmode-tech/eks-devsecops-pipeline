package dev.calebtetteh.catalog;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ProductControllerTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void listsAllProducts() throws Exception {
        mvc.perform(get("/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[0].id").value("p-100"));
    }

    @Test
    void returnsAProductWithIntegerCents() throws Exception {
        mvc.perform(get("/products/p-100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceCents").value(4999))
                .andExpect(jsonPath("$.inStock").value(true));
    }

    @Test
    void unknownProductIs404() throws Exception {
        mvc.perform(get("/products/p-999")).andExpect(status().isNotFound());
    }

    @Test
    void invalidIdIsRejected() throws Exception {
        mvc.perform(get("/products/DROP TABLE")).andExpect(status().is4xxClientError());
    }

    @Test
    void exposesProbesAndPrometheusButNothingElse() throws Exception {
        mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
        mvc.perform(get("/actuator/prometheus")).andExpect(status().isOk());
        mvc.perform(get("/actuator/env")).andExpect(status().isNotFound());
    }
}
