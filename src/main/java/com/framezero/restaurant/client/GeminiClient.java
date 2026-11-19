package com.framezero.restaurant.client;

import com.framezero.restaurant.dto.AiSummaryDto;
import com.framezero.restaurant.dto.ReviewDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
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

    @Value("${gemini.fallback-model:}")
    private String fallbackModel;

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
        if (isKeyMissing()) { log.debug("[AI] 키 없음"); return null; }
        if (reviews == null || reviews.isEmpty()) { log.info("[AI] 리뷰 0개라 요약 안 함"); return null; }

        var reviewText = reviews.stream()
                .filter(r -> r.text() != null && !r.text().isBlank())
                .limit(5)
                .map(r -> "- " + r.text())
                .collect(Collectors.joining("\n"));

        if (reviewText.isBlank()) { log.info("[AI] 리뷰 {}개 모두 본문 없음", reviews.size()); return null; }
        log.info("[AI] 리뷰 {}개로 요약 요청", reviews.size());

        var prompt = """
                다음은 일본 음식점의 구글 리뷰야. 한국인 여행자 관점에서 요약해.
                JSON으로만 답해: {"pros":[최대 2개], "cons":[최대 1개], "menus":[리뷰에 나온 메뉴 최대 2개]}
                각 항목은 20자 이내 한국어. 리뷰에 없는 내용은 지어내지 마.

                %s""".formatted(reviewText);
        return callGemini(prompt);
    }

    public AiSummaryDto summarizeFromGoogleSummary(String englishSummary) {
        if (isKeyMissing()) { log.debug("[AI] 키 없음"); return null; }
        if (englishSummary == null || englishSummary.isBlank()) { log.debug("[AI] Google 요약 없음"); return null; }
        log.info("[AI] Google 요약 기반 번역 요청");

        var prompt = """
                다음은 Google 지도 리뷰를 요약한 영어 문장이야. 한국인 여행자 관점에서 JSON으로만 답해:
                {"pros":[최대 2개], "cons":[최대 1개], "menus":[문장에 나온 메뉴 최대 2개], "fullKo":"입력 문장 전체를 자연스러운 한국어로 번역"}
                pros/cons/menus 각 항목은 20자 이내 한국어. 문장에 없는 내용은 절대 지어내지 마. 아쉬운 점이 문장에 없으면 cons는 빈 배열.
                fullKo는 원문 내용을 그대로 번역하고 추가·생략 금지.

                %s""".formatted(englishSummary);
        return callGemini(prompt);
    }

    private AiSummaryDto callGemini(String prompt) {
        var body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("responseMimeType", "application/json", "maxOutputTokens", 600)
        );

        AiSummaryDto result = callWithRetry(model, body);
        if (result != null) return result;

        if (fallbackModel != null && !fallbackModel.isBlank()) {
            log.info("[AI] 예비 모델로 전환: {}", fallbackModel);
            try {
                result = doCallGemini(fallbackModel, body);
            } catch (Exception e) {
                log.warn("Gemini 호출 실패: {}", e.getMessage());
            }
        }
        return result;
    }

    private AiSummaryDto callWithRetry(String modelName, Map<String, Object> body) {
        try {
            return doCallGemini(modelName, body);
        } catch (Exception e) {
            if (!isRetryable(e)) {
                if (e instanceof HttpClientErrorException ce && ce.getStatusCode().value() == 400) {
                    log.debug("[AI] 400 오류 (프롬프트/모델 문제): {}", e.getMessage());
                } else {
                    log.warn("[AI] 호출 실패: {}", e.getMessage());
                }
                return null;
            }
            log.info("[AI] 재시도");
            try {
                Thread.sleep(1500);
                return doCallGemini(modelName, body);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return null;
            } catch (Exception e2) {
                log.warn("[AI] 재시도 실패: {}", e2.getMessage());
                return null;
            }
        }
    }

    private AiSummaryDto doCallGemini(String modelName, Map<String, Object> body) throws Exception {
        var response = restClient.post()
                .uri(GENERATE_URL, modelName)
                .header("x-goog-api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(GeminiResponse.class);

        if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
            log.debug("[AI] candidates 없음");
            return null;
        }
        var content = response.candidates().get(0).content();
        var parts = content != null ? content.parts() : null;
        if (parts == null || parts.isEmpty()) {
            log.debug("[AI] parts 없음");
            return null;
        }
        String json = parts.get(parts.size() - 1).text();
        if (json != null) {
            json = json.strip();
            if (json.startsWith("```")) {
                json = json.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "").strip();
            }
        }
        log.debug("[AI] 응답 {}자", json != null ? json.length() : 0);
        return objectMapper.readValue(json, AiSummaryDto.class);
    }

    private boolean isRetryable(Exception e) {
        if (e instanceof HttpClientErrorException ce && ce.getStatusCode().value() == 429) return true;
        if (e instanceof HttpServerErrorException se && se.getStatusCode().value() == 503) return true;
        Throwable cause = e;
        while (cause != null) {
            if (cause instanceof java.net.SocketTimeoutException
                    || cause instanceof java.net.http.HttpTimeoutException) return true;
            cause = cause.getCause();
        }
        return false;
    }

    private record GeminiResponse(List<GeminiCandidate> candidates) {}
    private record GeminiCandidate(GeminiContent content) {}
    private record GeminiContent(List<GeminiPart> parts) {}
    private record GeminiPart(String text) {}
}