package com.framezero.restaurant;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class KeyStatusLogger {

    @Value("${google.maps.api-key:}")
    private String mapsApiKey;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.model}")
    private String geminiModel;

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        log.info("Places key: {}", mapsApiKey.isBlank() ? "missing" : "set");
        log.info("Gemini key: {}, model={}", geminiApiKey.isBlank() ? "missing" : "set", geminiModel);
    }
}