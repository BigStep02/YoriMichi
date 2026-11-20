# ---- 1단계: 빌드 (Gradle로 jar 만들기) ----
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon > /dev/null 2>&1 || true   # 의존성 캐시
COPY src src
RUN ./gradlew bootJar --no-daemon -x test \
 && cp "$(ls build/libs/*.jar | grep -v plain | head -n1)" /app/app.jar

# ---- 2단계: 실행 (JRE만 들어간 가벼운 이미지) ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/app.jar app.jar
ENV JAVA_OPTS="-Xms256m -Xmx1024m"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
