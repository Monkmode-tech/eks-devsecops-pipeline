# catalog-service: multi-stage build. The JDK and Maven exist only in the build
# stage; the runtime image is a JRE with the single application jar.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp package -DskipTests

FROM eclipse-temurin:21-jre-alpine
# Apply Alpine security fixes released after the base image was built.
# hadolint ignore=DL3017
RUN apk upgrade --no-cache
WORKDIR /app
COPY --from=build /src/target/catalog-service.jar /app/app.jar

# Same fixed non-root UID/GID as orders-api, pinned again in Kubernetes.
USER 10001:10001

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/actuator/health/liveness"]

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:+ExitOnOutOfMemoryError", "-Djava.io.tmpdir=/tmp", "-jar", "/app/app.jar"]
