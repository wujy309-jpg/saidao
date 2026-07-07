package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.AiConversation;
import com.training.backend.entity.AiMessage;
import com.training.backend.entity.KnowledgeArticle;
import com.training.backend.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiAssistantController {
    
    private final DeepSeekService deepSeekService;
    private final KnowledgeBaseService knowledgeBaseService;
    private final AiConversationService conversationService;
    
    @PostMapping("/chat/stream")
    public SseEmitter chatStream(@RequestBody Map<String, String> request) {
        String message = request.getOrDefault("message", "");
        String language = request.getOrDefault("language", "java");
        String topic = request.getOrDefault("topic", "");
        
        String knowledgeContext = knowledgeBaseService.buildKnowledgeContext(language, topic);
        
        String systemPrompt = """
                你是一个智能实训助手，专门帮助学生解决编程学习中的问题。
                
                你的能力：
                1. 解答编程问题
                2. 解释代码逻辑
                3. 提供最佳实践建议
                4. 帮助调试代码
                5. 推荐学习资源
                
                知识库参考：
                %s
                
                请用友好、专业的语气回答问题。如果涉及代码，请使用Markdown代码块格式。
                """.formatted(knowledgeContext);
        
        return deepSeekService.chatStream(systemPrompt, message);
    }
    
    @PostMapping("/chat/conversation")
    public ResponseEntity<ApiResponse<List<AiMessage>>> chatInConversation(
            @RequestParam Long userId,
            @RequestParam(required = false) Long conversationId,
            @RequestBody Map<String, String> request) {
        
        String message = request.getOrDefault("message", "");
        String title = request.getOrDefault("title", "新对话");
        String contextType = request.getOrDefault("contextType", "general");
        
        AiConversation conversation;
        if (conversationId != null) {
            conversation = conversationService.getConversation(conversationId, userId);
        } else {
            conversation = conversationService.createConversation(userId, title, contextType);
        }
        
        conversationService.addMessage(conversation.getId(), "user", message, "text");
        
        List<AiMessage> history = conversationService.buildMessageHistory(conversation.getId(), 10);
        
        String knowledgeContext = knowledgeBaseService.buildKnowledgeContext(
                contextType, message);
        
        String systemPrompt = """
                你是一个智能实训助手。请根据对话历史和知识库内容回答问题。
                
                知识库参考：
                %s
                """.formatted(knowledgeContext);
        
        String response = deepSeekService.chatWithHistory(systemPrompt, history, message);
        
        if (response != null) {
            conversationService.addMessage(conversation.getId(), "assistant", response, "text");
        }
        
        List<AiMessage> messages = conversationService.getConversationMessages(conversation.getId());
        return ResponseEntity.ok(ApiResponse.success(messages));
    }
    
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<AiConversation>>> getUserConversations(@RequestParam Long userId) {
        List<AiConversation> conversations = conversationService.getUserConversations(userId);
        return ResponseEntity.ok(ApiResponse.success(conversations));
    }
    
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<List<AiMessage>>> getConversationMessages(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        conversationService.getConversation(conversationId, userId);
        List<AiMessage> messages = conversationService.getConversationMessages(conversationId);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }
    
    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<ApiResponse<Void>> deleteConversation(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        conversationService.deleteConversation(conversationId, userId);
        return ResponseEntity.ok(ApiResponse.success("对话已删除", null));
    }
    
    @PostMapping("/explain-code")
    public ResponseEntity<ApiResponse<String>> explainCode(@RequestBody Map<String, String> request) {
        String code = request.getOrDefault("code", "");
        String language = request.getOrDefault("language", "Java");
        
        String result = deepSeekService.explainCode(code, language);
        
        if (result != null) {
            return ResponseEntity.ok(ApiResponse.success(result));
        } else {
            return ResponseEntity.ok(ApiResponse.error("AI服务暂时不可用"));
        }
    }
    
    @PostMapping("/analyze-project")
    public ResponseEntity<ApiResponse<String>> analyzeProject(@RequestBody Map<String, String> request) {
        String projectStructure = request.getOrDefault("projectStructure", "");
        String codeFiles = request.getOrDefault("codeFiles", "");
        
        String result = deepSeekService.analyzeProject(projectStructure, codeFiles);
        
        if (result != null) {
            return ResponseEntity.ok(ApiResponse.success(result));
        } else {
            return ResponseEntity.ok(ApiResponse.error("AI服务暂时不可用"));
        }
    }
    
    @PostMapping("/ask")
    public ResponseEntity<ApiResponse<String>> askQuestion(@RequestBody Map<String, String> request) {
        String question = request.getOrDefault("question", "");
        String language = request.getOrDefault("language", "java");
        String topic = request.getOrDefault("topic", question);
        
        String knowledgeContext = knowledgeBaseService.buildKnowledgeContext(language, topic);
        String result = deepSeekService.answerWithContext(knowledgeContext, question);
        
        if (result != null) {
            return ResponseEntity.ok(ApiResponse.success(result));
        } else {
            return ResponseEntity.ok(ApiResponse.error("AI服务暂时不可用"));
        }
    }
    
    @GetMapping("/knowledge/categories")
    public ResponseEntity<ApiResponse<List<String>>> getKnowledgeCategories() {
        List<String> categories = knowledgeBaseService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success(categories));
    }
    
    @GetMapping("/knowledge/languages")
    public ResponseEntity<ApiResponse<List<String>>> getKnowledgeLanguages() {
        List<String> languages = knowledgeBaseService.getAllLanguages();
        return ResponseEntity.ok(ApiResponse.success(languages));
    }
    
    @GetMapping("/knowledge/search")
    public ResponseEntity<ApiResponse<List<KnowledgeArticle>>> searchKnowledge(@RequestParam String keyword) {
        List<KnowledgeArticle> articles = knowledgeBaseService.searchArticles(keyword);
        return ResponseEntity.ok(ApiResponse.success(articles));
    }
    
    @GetMapping("/knowledge/category/{category}")
    public ResponseEntity<ApiResponse<List<KnowledgeArticle>>> getKnowledgeByCategory(@PathVariable String category) {
        List<KnowledgeArticle> articles = knowledgeBaseService.getArticlesByCategory(category);
        return ResponseEntity.ok(ApiResponse.success(articles));
    }
}
