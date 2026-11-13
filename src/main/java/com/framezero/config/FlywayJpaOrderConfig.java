package com.framezero.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.stream.Stream;

// Spring Boot 4에서 EntityManagerFactoryDependsOnPostProcessor가 제거됨.
// BeanFactoryPostProcessor로 entityManagerFactory → flyway 의존 관계를 직접 추가.
@Configuration(proxyBeanMethods = false)
public class FlywayJpaOrderConfig implements BeanFactoryPostProcessor {

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        if (!beanFactory.containsBeanDefinition("entityManagerFactory")) return;
        BeanDefinition bd = beanFactory.getBeanDefinition("entityManagerFactory");
        String[] existing = bd.getDependsOn();
        if (existing != null && Arrays.asList(existing).contains("flyway")) return;
        bd.setDependsOn(Stream.concat(
                existing == null ? Stream.empty() : Arrays.stream(existing),
                Stream.of("flyway")
        ).toArray(String[]::new));
    }
}