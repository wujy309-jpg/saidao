package com.training.backend.service;

import com.training.backend.entity.AuditLog;
import com.training.backend.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {
    
    private final AuditLogRepository auditLogRepository;
    
    @Async
    public void logAction(Long userId, String username, String action, String resourceType, 
                          Long resourceId, String details, boolean success, String errorMessage) {
        try {
            String ipAddress = null;
            String userAgent = null;
            
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                ipAddress = getClientIp(request);
                userAgent = request.getHeader("User-Agent");
                if (userAgent != null && userAgent.length() > 500) {
                    userAgent = userAgent.substring(0, 500);
                }
            }
            
            AuditLog auditLog = AuditLog.builder()
                    .userId(userId)
                    .username(username)
                    .action(action)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .details(details)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .success(success)
                    .errorMessage(errorMessage)
                    .build();
            
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("记录审计日志失败: {}", e.getMessage());
        }
    }
    
    public void logLogin(Long userId, String username, boolean success, String errorMessage) {
        logAction(userId, username, "LOGIN", "USER", userId, null, success, errorMessage);
    }
    
    public void logLogout(Long userId, String username) {
        logAction(userId, username, "LOGOUT", "USER", userId, null, true, null);
    }
    
    public void logCreate(Long userId, String username, String resourceType, Long resourceId, String details) {
        logAction(userId, username, "CREATE", resourceType, resourceId, details, true, null);
    }
    
    public void logUpdate(Long userId, String username, String resourceType, Long resourceId, String details) {
        logAction(userId, username, "UPDATE", resourceType, resourceId, details, true, null);
    }
    
    public void logDelete(Long userId, String username, String resourceType, Long resourceId) {
        logAction(userId, username, "DELETE", resourceType, resourceId, null, true, null);
    }
    
    public void logAccess(Long userId, String username, String resourceType, Long resourceId) {
        logAction(userId, username, "ACCESS", resourceType, resourceId, null, true, null);
    }
    
    public Page<AuditLog> getUserAuditLogs(Long userId, Pageable pageable) {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
    
    public Page<AuditLog> getAllAuditLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }
    
    public List<AuditLog> getAuditLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return auditLogRepository.findByDateRange(startDate, endDate);
    }
    
    public List<Object[]> getActionStatistics(LocalDateTime since) {
        return auditLogRepository.getActionStatistics(since);
    }
    
    public List<AuditLog> getFailedActions(LocalDateTime since) {
        return auditLogRepository.findFailedActions(since);
    }
    
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}
