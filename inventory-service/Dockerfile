FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
# Some build contexts (e.g. Testcontainers' image builder) stamp every file with 1970; Maven then
# skips copying non-filtered resources and the jar ships without schema.sql. Refresh the times first.
RUN find src -exec touch {} + && mvn -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/target/inventory-service-1.0.0.jar app.jar
USER nobody
EXPOSE 8080
# Heap = half the container mem_limit (JVM default is 25%; with no limit, 25% of *host* RAM).
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=50", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
