package com.saidao.backend.config;

import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.exception.TokenInsufficientException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    private final Map<String, Long> errorCounts = new ConcurrentHashMap<>();
    
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException e, WebRequest request) {
        String errorKey = e.getClass().getSimpleName() + ":" + e.getMessage();
        incrementErrorCount(errorKey);
        
        log.error("运行时异常 [{}]: {}", errorKey, e.getMessage());
        
        if (e.getMessage().contains("已锁定") || e.getMessage().contains("已封禁")) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error(e.getMessage()));
        }
        
        if (e.getMessage().contains("不存在") || e.getMessage().contains("已存在")) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
        
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage()));
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(
            MethodArgumentNotValidException e) {
        Map<String, String> errors = new HashMap<>();
        
        e.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        log.error("参数验证失败: {}", errors);
        
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("参数验证失败", errors));
    }
    
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(BadCredentialsException e) {
        log.error("认证失败: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("用户名或密码错误"));
    }
    
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException e) {
        log.error("访问被拒绝: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("没有权限访问该资源"));
    }
    
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.error("非法参数: {}", e.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage()));
    }
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFoundException(ResourceNotFoundException e) {
        log.error("资源未找到: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage()));
    }
    
    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicateResourceException(DuplicateResourceException e) {
        log.error("资源重复: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(e.getMessage()));
    }
    
    @ExceptionHandler(TokenInsufficientException.class)
    public ResponseEntity<ApiResponse<Void>> handleTokenInsufficient(TokenInsufficientException e) {
        log.warn("Token 余额不足: {}", e.getMessage());
        // 402：前端据此引导用户前往充值中心
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                .body(ApiResponse.error(e.getMessage()));
    }
    
    @ExceptionHandler(OperationNotAllowedException.class)
    public ResponseEntity<ApiResponse<Void>> handleOperationNotAllowedException(OperationNotAllowedException e) {
        log.error("操作不允许: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage()));
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e, WebRequest request) {
        String errorKey = e.getClass().getSimpleName();
        incrementErrorCount(errorKey);
        
        log.error("系统异常 [{}]: {}", errorKey, e.getMessage(), e);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("系统内部错误，请稍后重试"));
    }
    
    private void incrementErrorCount(String key) {
        errorCounts.merge(key, 1L, Long::sum);
    }
    
    public Map<String, Long> getErrorStatistics() {
        return new HashMap<>(errorCounts);
    }
    
    public static class ResourceNotFoundException extends RuntimeException {
        public ResourceNotFoundException(String message) {
            super(message);
        }
    }
    
    public static class DuplicateResourceException extends RuntimeException {
        public DuplicateResourceException(String message) {
            super(message);
        }
    }
    
    public static class OperationNotAllowedException extends RuntimeException {
        public OperationNotAllowedException(String message) {
            super(message);
        }
    }
}
