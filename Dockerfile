# ---------- 1) frontend ----------
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- 2) backend (com o front embutido) ----------
FROM maven:3.9-eclipse-temurin-21 AS api
WORKDIR /api
COPY backend/pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY backend/src ./src
# o SPA buildado vira conteúdo estático servido pelo próprio Spring
COPY --from=web /web/dist ./src/main/resources/static
RUN mvn -B -q -DskipTests package

# ---------- 3) runtime ----------
FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl tzdata \
    && addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=api /api/target/concurso-backend-*.jar app.jar
# o banco vive no volume; o usuário do container precisa escrever nele
RUN mkdir -p /dados/segredos && chown -R app:app /dados /app
USER app
ENV TZ=America/Sao_Paulo \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Duser.timezone=America/Sao_Paulo -Djava.io.tmpdir=/tmp"
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:8080/api/concursos > /dev/null || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
