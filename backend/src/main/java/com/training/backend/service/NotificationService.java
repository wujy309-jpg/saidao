package com.training.backend.service;

import com.training.backend.entity.Notification;
import com.training.backend.entity.Notification.NotificationType;
import com.training.backend.entity.User;
import com.training.backend.repository.NotificationRepository;
import com.training.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 通知服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    
    /**
     * 创建通知
     */
    @Transactional
    public Notification createNotification(Long userId, NotificationType type, String title, 
                                           String content, Long relatedId, String relatedType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setIsRead(false);
        notification.setRelatedId(relatedId);
        notification.setRelatedType(relatedType);
        
        Notification savedNotification = notificationRepository.save(notification);
        log.debug("通知已创建: 用户={}, 类型={}, 标题={}", user.getName(), type, title);
        
        return savedNotification;
    }
    
    /**
     * 获取用户的所有通知
     */
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    /**
     * 获取用户的未读通知
     */
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }
    
    /**
     * 获取用户的未读通知数
     */
    public Long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
    
    /**
     * 标记通知为已读
     */
    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.markAsRead(notificationId);
    }
    
    /**
     * 标记用户所有通知为已读
     */
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
        log.info("用户 {} 的所有通知已标记为已读", userId);
    }
    
    /**
     * 删除通知
     */
    @Transactional
    public void deleteNotification(Long notificationId) {
        notificationRepository.deleteById(notificationId);
    }
    
    /**
     * 清空用户的所有通知
     */
    @Transactional
    public void clearAllNotifications(Long userId) {
        notificationRepository.deleteByUserId(userId);
        log.info("用户 {} 的所有通知已清空", userId);
    }
}
