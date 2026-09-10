FROM node:24-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/ ./
RUN node scripts/build.mjs

FROM maven:3.9.11-eclipse-temurin-21 AS backend
WORKDIR /app
COPY backend/ backend/
COPY --from=frontend /app/frontend/dist frontend/dist
RUN mvn -B -f backend/pom.xml verify

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S app -G app && mkdir -p /app/data && chown -R app:app /app
WORKDIR /app
COPY --from=backend /app/backend/target/ba-tinder-0.1.0.jar app.jar
USER app
ENV SERVER_ADDRESS=0.0.0.0
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
