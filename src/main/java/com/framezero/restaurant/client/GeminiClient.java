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

import java.util.Arrays;
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

    @Value("${gemini.fallback-models:}")
    private String fallbackModelsRaw;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiClient(@Qualifier("geminiRestClient") RestClient restClient, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    public boolean isKeyMissing() {
        return apiKey == null || apiKey.isBlank();
    }

    private List<String> fallbackModels() {
        if (fallbackModelsRaw == null || fallbackModelsRaw.isBlank()) return List.of();
        return Arrays.stream(fallbackModelsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
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

        AiSummaryDto result = callPrimary(model, body);
        if (result != null) return result;

        for (String fb : fallbackModels()) {
            result = callOnce(fb, body);
            if (result != null) return result;
        }
        return null;
    }

    // 기본 모델: 503/429면 1.5초 후 1회 재시도, 타임아웃이면 재시도 없이 종료
    private AiSummaryDto callPrimary(String modelName, Map<String, Object> body) {
        long t = System.currentTimeMillis();
        try {
            AiSummaryDto r = doCallGemini(modelName, body);
            if (r != null) log.info("[AI] 성공 model={} {}ms", modelName, System.currentTimeMillis() - t);
            return r;
        } catch (Exception e) {
            if (is400(e)) { log.debug("[AI] 실패 model={} 400 오류", modelName); return null; }
            log.info("[AI] 실패 model={} {}", modelName, reasonOf(e));
            if (!isRateLimited(e)) return null;

            try { Thread.sleep(1500); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); return null; }
            long t2 = System.currentTimeMillis();
            try {
                AiSummaryDto r = doCallGemini(modelName, body);
                if (r != null) log.info("[AI] 성공 model={} {}ms", modelName, System.currentTimeMillis() - t2);
                return r;
            } catch (Exception e2) {
                log.info("[AI] 실패 model={} {}", modelName, reasonOf(e2));
                return null;
            }
        }
    }

    // 예비 모델: 각 1회만
    private AiSummaryDto callOnce(String modelName, Map<String, Object> body) {
        long t = System.currentTimeMillis();
        try {
            AiSummaryDto r = doCallGemini(modelName, body);
            if (r != null) log.info("[AI] 성공 model={} {}ms", modelName, System.currentTimeMillis() - t);
            return r;
        } catch (Exception e) {
            if (is400(e)) { log.debug("[AI] 실패 model={} 400 오류", modelName); }
            else { log.info("[AI] 실패 model={} {}", modelName, reasonOf(e)); }
            return null;
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

    private boolean isRateLimited(Exception e) {
        if (e instanceof HttpClientErrorException ce && ce.getStatusCode().value() == 429) return true;
        if (e instanceof HttpServerErrorException se && se.getStatusCode().value() == 503) return true;
        return false;
    }

    private boolean is400(Exception e) {
        return e instanceof HttpClientErrorException ce && ce.getStatusCode().value() == 400;
    }

    private String reasonOf(Exception e) {
        if (e instanceof HttpClientErrorException ce) return "HTTP " + ce.getStatusCode().value();
        if (e instanceof HttpServerErrorException se) return "HTTP " + se.getStatusCode().value();
        if (isTimeout(e)) return "타임아웃";
        return e.getClass().getSimpleName();
    }

    private boolean isTimeout(Exception e) {
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