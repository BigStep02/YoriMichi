package com.framezero.restaurant.client;

import com.framezero.restaurant.dto.AiSummaryDto;
import com.framezero.restaurant.dto.ReviewDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
public class GeminiClient {

    private static final String GENERATE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model}")
    private String model;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiClient(@Qualifier("geminiRestClient") RestClient restClient, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    public boolean isKeyMissing() {
        return apiKey == null || apiKey.isBlank();
    }

    public AiSummaryDto summarize(List<ReviewDto> reviews) {
        if (isKeyMissing() || reviews == null || reviews.isEmpty()) return null;

        var reviewText = reviews.stream()
                .filter(r -> r.text() != null && !r.text().isBlank())
                .limit(5)
                .map(r -> "- " + r.text())
                .collect(Collectors.joining("\n"));

        if (reviewText.isBlank()) return null;

        var prompt = """
                다음은 일본 음식점의 구글 리뷰야. 한국인 여행자 관점에서 요약해.
                JSON으로만 답해: {"pros":[최대 2개], "cons":[최대 1개], "menus":[리뷰에 나온 메뉴 최대 2개]}
                각 항목은 20자 이내 한국어. 리뷰에 없는 내용은 지어내지 마.

                %s""".formatted(reviewText);

        var body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("responseMimeType", "application/json")
        );

        try {
            var response = restClient.post()
                    .uri(GENERATE_URL, model)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(GeminiResponse.class);

            if (response == null || response.candidates() == null || response.candidates().isEmpty()) return null;

            var parts = response.candidates().get(0).content().parts();
            if (parts == null || parts.isEmpty()) return null;

            return objectMapper.readValue(parts.get(0).text(), AiSummaryDto.class);

        } catch (Exception e) {
            log.warn("Gemini summarize failed: {}", e.getMessage());
            return null;
        }
    }

    private record GeminiResponse(List<GeminiCandidate> candidates) {}
    private record GeminiCandidate(GeminiContent content) {}
    private record GeminiContent(List<GeminiPart> parts) {}
    private record GeminiPart(String text) {}
}