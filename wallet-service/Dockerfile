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
# Healthcheck uses the base image's busybox wget. App writes only to /tmp (Tomcat work dir).
COPY --from=build /build/target/wallet-service-1.0.0.jar app.jar
EXPOSE 8080
USER nobody
# OOM -> exit -> Docker restarts it, instead of a half-dead JVM.
# Heap = half the container mem_limit (JVM default is 25%; with no limit, 25% of *host* RAM).
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=50", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
