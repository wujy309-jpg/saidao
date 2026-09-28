package com.saidao.backend.annotation;

import com.saidao.backend.entity.TokenScene;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * AI 接口扣费标注：方法进入前按场景单价扣 Token，失败自动退款。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface CostTokens {
    TokenScene value();
}
