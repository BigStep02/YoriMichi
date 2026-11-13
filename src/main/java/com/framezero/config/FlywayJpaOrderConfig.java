package com.framezero.config;

import org.springframework.boot.orm.jpa.EntityManagerFactoryDependsOnPostProcessor;
import org.springframework.context.annotation.Configuration;

// Spring Boot 4에서 Flyway → JPA 초기화 순서가 자동 보장되지 않는 경우를 대비한 명시적 설정.
// entityManagerFactory(ddl-auto: validate)가 flyway bean 완료 후 실행되도록 의존 관계 추가.
@Configuration(proxyBeanMethods = false)
public class FlywayJpaOrderConfig extends EntityManagerFactoryDependsOnPostProcessor {

    public FlywayJpaOrderConfig() {
        super("flyway");
    }
}