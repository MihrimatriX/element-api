FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Healthcheck uses the base image's busybox wget. App writes only to /tmp (Tomcat work dir).
COPY --from=build /build/target/wallet-service-1.0.0.jar app.jar
EXPOSE 8080
USER nobody
# OOM -> exit -> Docker restarts it, instead of a half-dead JVM.
ENTRYPOINT ["java", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
