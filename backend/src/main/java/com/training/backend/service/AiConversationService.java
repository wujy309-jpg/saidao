package com.training.backend.service;

import com.training.backend.entity.AiConversation;
import com.training.backend.entity.AiMessage;
import com.training.backend.repository.AiConversationRepository;
import com.training.backend.repository.AiMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiConversationService {
    
    private final AiConversationRepository conversationRepository;
    private final AiMessageRepository messageRepository;
    
    @Transactional
    public AiConversation createConversation(Long userId, String title, String contextType) {
        AiConversation conversation = AiConversation.builder()
                .userId(userId)
                .title(title)
                .contextType(contextType)
                .isActive(true)
                .build();
        
        return conversationRepository.save(conversation);
    }
    
    @Transactional(readOnly = true)
    public List<AiConversation> getUserConversations(Long userId) {
        return conversationRepository.findByUserIdAndIsActiveTrueOrderByUpdatedAtDesc(userId);
    }
    
    @Transactional(readOnly = true)
    public AiConversation getConversation(Long conversationId, Long userId) {
        return conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("对话不存在"));
    }
    
    @Transactional
    public AiMessage addMessage(Long conversationId, String role, String content, String messageType) {
        AiConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("对话不存在"));
        
        AiMessage message = AiMessage.builder()
                .conversation(conversation)
                .role(role)
                .content(content)
                .messageType(messageType)
                .build();
        
        AiMessage savedMessage = messageRepository.save(message);
        
        conversation.setUpdatedAt(java.time.LocalDateTime.now());
        conversationRepository.save(conversation);
        
        return savedMessage;
    }
    
    @Transactional(readOnly = true)
    public List<AiMessage> getConversationMessages(Long conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }
    
    @Transactional(readOnly = true)
    public List<AiMessage> getRecentMessages(Long conversationId, int limit) {
        List<AiMessage> messages = messageRepository.findTop20ByConversationIdOrderByCreatedAtDesc(conversationId);
        return messages.stream().limit(limit).collect(Collectors.toList());
    }
    
    @Transactional
    public void deleteConversation(Long conversationId, Long userId) {
        AiConversation conversation = getConversation(conversationId, userId);
        conversation.setIsActive(false);
        conversationRepository.save(conversation);
    }
    
    public List<AiMessage> buildMessageHistory(Long conversationId, int maxMessages) {
        List<AiMessage> recentMessages = getRecentMessages(conversationId, maxMessages);
        List<AiMessage> history = new ArrayList<>();
        for (int i = recentMessages.size() - 1; i >= 0; i--) {
            history.add(recentMessages.get(i));
        }
        return history;
    }
}
