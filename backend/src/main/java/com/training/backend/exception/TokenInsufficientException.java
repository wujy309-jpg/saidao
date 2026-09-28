package com.training.backend.exception;

/**
 * Token 余额不足（映射 HTTP 402，前端引导充值）
 */
public class TokenInsufficientException extends RuntimeException {

    public TokenInsufficientException(String message) {
        super(message);
    }
}
