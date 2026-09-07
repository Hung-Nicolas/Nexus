# ─── Build del backend Spring Boot ───
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

COPY backend/gradlew backend/gradlew.bat backend/build.gradle backend/settings.gradle ./
COPY backend/gradle ./gradle
COPY backend/src ./src

RUN chmod +x gradlew && ./gradlew bootJar --no-daemon -x test

# ─── Runtime ───
FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 3000
ENTRYPOINT ["java", "-jar", "app.jar"]
