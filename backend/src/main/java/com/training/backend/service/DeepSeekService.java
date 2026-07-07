package com.training.backend.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.backend.config.DeepSeekConfig;
import com.training.backend.entity.AiMessage;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeepSeekService {
    
    private final DeepSeekConfig config;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    
    public String chat(String systemPrompt, String userMessage) {
        if (!isApiEnabled()) {
            return null;
        }
        
        try {
            List<Message> messages = List.of(
                new Message("system", systemPrompt),
                new Message("user", userMessage)
            );
            
            DeepSeekResponse response = callApi(messages, false);
            
            if (response != null && response.getChoices() != null && !response.getChoices().isEmpty()) {
                return response.getChoices().get(0).getMessage().getContent();
            }
            
            return null;
        } catch (Exception e) {
            log.error("DeepSeek API调用失败", e);
            return null;
        }
    }
    
    public String chatWithHistory(String systemPrompt, List<AiMessage> history, String userMessage) {
        if (!isApiEnabled()) {
            return null;
        }
        
        try {
            List<Message> messages = new ArrayList<>();
            messages.add(new Message("system", systemPrompt));
            
            for (AiMessage msg : history) {
                messages.add(new Message(msg.getRole(), msg.getContent()));
            }
            messages.add(new Message("user", userMessage));
            
            DeepSeekResponse response = callApi(messages, false);
            
            if (response != null && response.getChoices() != null && !response.getChoices().isEmpty()) {
                return response.getChoices().get(0).getMessage().getContent();
            }
            
            return null;
        } catch (Exception e) {
            log.error("DeepSeek API调用失败", e);
            return null;
        }
    }
    
    public SseEmitter chatStream(String systemPrompt, String userMessage) {
        SseEmitter emitter = new SseEmitter(60000L);
        
        CompletableFuture.runAsync(() -> {
            try {
                List<Message> messages = List.of(
                    new Message("system", systemPrompt),
                    new Message("user", userMessage)
                );
                
                WebClient webClient = webClientBuilder.baseUrl(config.getBaseUrl()).build();
                
                DeepSeekRequest request = new DeepSeekRequest();
                request.setModel(config.getModel());
                request.setMaxTokens(config.getMaxTokens());
                request.setTemperature(config.getTemperature());
                request.setStream(true);
                request.setMessages(messages);
                
                webClient.post()
                    .uri("/v1/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + config.getApiKey())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToFlux(String.class)
                    .subscribe(
                        chunk -> {
                            try {
                                if (chunk != null && !chunk.equals("[DONE]")) {
                                    if (chunk.startsWith("data: ")) {
                                        chunk = chunk.substring(6);
                                    }
                                    StreamResponse streamResponse = objectMapper.readValue(chunk, StreamResponse.class);
                                    if (streamResponse.getChoices() != null && !streamResponse.getChoices().isEmpty()) {
                                        String content = streamResponse.getChoices().get(0).getDelta().getContent();
                                        if (content != null) {
                                            emitter.send(SseEmitter.event().data(content));
                                        }
                                    }
                                }
                            } catch (Exception e) {
                                log.debug("解析流式响应: {}", e.getMessage());
                            }
                        },
                        error -> {
                            log.error("流式响应错误", error);
                            emitter.completeWithError(error);
                        },
                        () -> {
                            try {
                                emitter.send(SseEmitter.event().data("[DONE]"));
                                emitter.complete();
                            } catch (IOException e) {
                                emitter.completeWithError(e);
                            }
                        }
                    );
            } catch (Exception e) {
                log.error("流式聊天失败", e);
                emitter.completeWithError(e);
            }
        });
        
        return emitter;
    }
    
    public String explainCode(String code, String language) {
        String systemPrompt = """
                你是一个专业的编程教师。请详细解释以下代码的工作原理。
                
                要求：
                1. 先给出代码的整体功能概述
                2. 逐行或逐块解释代码逻辑
                3. 解释关键概念和设计模式
                4. 指出代码的优点和可能的改进点
                5. 使用通俗易懂的语言，适合初学者理解
                
                请使用Markdown格式输出，包含标题和代码块。
                """;
        
        String userMessage = String.format("编程语言: %s\n\n代码:\n```%s\n%s\n```", language, language.toLowerCase(), code);
        
        return chat(systemPrompt, userMessage);
    }
    
    public String analyzeProject(String projectStructure, String codeFiles) {
        String systemPrompt = """
                你是一个资深的软件架构师。请分析以下项目的整体结构和代码质量。
                
                请从以下维度进行分析：
                1. 项目结构：目录组织是否合理
                2. 代码质量：是否遵循最佳实践
                3. 架构设计：是否符合设计原则
                4. 安全性：是否存在安全隐患
                5. 性能：是否有性能问题
                6. 可维护性：代码是否易于维护
                7. 改进建议：具体的优化建议
                
                请以JSON格式返回结果：
                {
                    "overallScore": 0-100,
                    "structureScore": 0-100,
                    "qualityScore": 0-100,
                    "architectureScore": 0-100,
                    "securityScore": 0-100,
                    "performanceScore": 0-100,
                    "maintainabilityScore": 0-100,
                    "summary": "整体评价",
                    "strengths": ["优点1", "优点2"],
                    "weaknesses": ["问题1", "问题2"],
                    "suggestions": ["建议1", "建议2"]
                }
                """;
        
        String userMessage = String.format("项目结构:\n%s\n\n主要代码文件:\n%s", projectStructure, codeFiles);
        
        return chat(systemPrompt, userMessage);
    }
    
    public String answerWithContext(String knowledgeContext, String question) {
        String systemPrompt = """
                你是一个智能实训助手。请根据提供的知识库内容回答用户的问题。
                
                要求：
                1. 优先使用知识库中的内容回答
                2. 如果知识库中没有相关内容，使用你的知识回答
                3. 回答要准确、详细、易懂
                4. 适当给出代码示例
                5. 如果涉及代码，请使用Markdown代码块格式
                
                知识库内容：
                %s
                """.formatted(knowledgeContext);
        
        return chat(systemPrompt, question);
    }
    
    public String reviewCode(String code, String language) {
        String systemPrompt = """ 
                你是一个专业的代码评审专家。请分析以下代码并给出评审结果。
                
                请以JSON格式返回结果，包含以下字段：
                {
                    "qualityScore": 0-100的质量分数,
                    "documentationScore": 0-100的文档分数,
                    "completenessScore": 0-100的完整性分数,
                    "standardizationScore": 0-100的规范性分数,
                    "totalScore": 0-100的总分,
                    "feedback": "总体评价（50字以内）",
                    "suggestions": ["建议1", "建议2", "建议3"],
                    "issues": ["问题1", "问题2"]
                }
                
                评分标准：
                - 代码质量(40%): 代码结构、可读性、复杂度
                - 文档完整性(20%): 注释、文档、说明
                - 功能完整性(20%): 功能实现完整度
                - 代码规范(20%): 命名规范、格式规范
                
                请只返回JSON，不要有其他内容。
                """;
        
        String userMessage = String.format("编程语言: %s\n\n代码:\n```%s\n%s\n```", language, language.toLowerCase(), code);
        
        return chat(systemPrompt, userMessage);
    }
    
    public String reviewDocument(String documentContent, String documentType) {
        String systemPrompt = """
                你是一个专业的文档评审专家。请分析以下文档并给出评审结果。
                
                请以JSON格式返回结果，包含以下字段：
                {
                    "contentScore": 0-100的内容质量分数,
                    "structureScore": 0-100的结构分数,
                    "completenessScore": 0-100的完整性分数,
                    "formatScore": 0-100的格式分数,
                    "totalScore": 0-100的总分,
                    "feedback": "总体评价（50字以内）",
                    "suggestions": ["建议1", "建议2", "建议3"],
                    "issues": ["问题1", "问题2"]
                }
                
                评分标准：
                - 内容质量(40%): 内容准确性、深度、价值
                - 结构清晰(20%): 逻辑性、层次感
                - 完整性(20%): 覆盖面、详细程度
                - 格式规范(20%): 排版、格式、可读性
                
                请只返回JSON，不要有其他内容。
                """;
        
        String userMessage = String.format("文档类型: %s\n\n文档内容:\n%s", documentType, documentContent);
        
        return chat(systemPrompt, userMessage);
    }
    
    public String generateLearningAdvice(String studentName, String taskTitle, String currentProgress) {
        String systemPrompt = """
                你是一个专业的教育顾问。请根据学生的当前情况，给出个性化的学习建议。
                
                要求：
                1. 建议要具体可执行
                2. 语言要鼓励性
                3. 给出3-5条建议
                4. 每条建议不超过30字
                """;
        
        String userMessage = String.format(
                "学生姓名: %s\n任务标题: %s\n当前进度: %s",
                studentName, taskTitle, currentProgress
        );
        
        return chat(systemPrompt, userMessage);
    }
    
    public String reviewCodeWithCriteria(String code, String language, String criteriaDescription) {
        String systemPrompt = """
                你是一个专业的代码评审专家。请根据以下评审标准分析代码并给出评审结果。
                
                评审标准：
                %s
                
                请以JSON格式返回结果，包含以下字段：
                {
                    "totalScore": 0-100的总分,
                    "dimension1Score": 0-100的第一个维度分数,
                    "dimension2Score": 0-100的第二个维度分数,
                    "dimension3Score": 0-100的第三个维度分数,
                    "dimension4Score": 0-100的第四个维度分数,
                    "feedback": "总体评价（50字以内）",
                    "suggestions": ["建议1", "建议2", "建议3"],
                    "issues": ["问题1", "问题2"]
                }
                
                请根据评审标准中的维度和权重进行评分，确保总分是各维度分数的加权平均。
                请只返回JSON，不要有其他内容。
                """.formatted(criteriaDescription);
        
        String userMessage = String.format("编程语言: %s\n\n代码:\n```%s\n%s\n```", language, language.toLowerCase(), code);
        
        return chat(systemPrompt, userMessage);
    }
    
    public String reviewDocumentWithCriteria(String documentContent, String documentType, String criteriaDescription) {
        String systemPrompt = """
                你是一个专业的文档评审专家。请根据以下评审标准分析文档并给出评审结果。
                
                评审标准：
                %s
                
                请以JSON格式返回结果，包含以下字段：
                {
                    "totalScore": 0-100的总分,
                    "dimension1Score": 0-100的第一个维度分数,
                    "dimension2Score": 0-100的第二个维度分数,
                    "dimension3Score": 0-100的第三个维度分数,
                    "dimension4Score": 0-100的第四个维度分数,
                    "feedback": "总体评价（50字以内）",
                    "suggestions": ["建议1", "建议2", "建议3"],
                    "issues": ["问题1", "问题2"]
                }
                
                请根据评审标准中的维度和权重进行评分，确保总分是各维度分数的加权平均。
                请只返回JSON，不要有其他内容。
                """.formatted(criteriaDescription);
        
        String userMessage = String.format("文档类型: %s\n\n文档内容:\n%s", documentType, documentContent);
        
        return chat(systemPrompt, userMessage);
    }
    
    public String generateLearningPath(String studentProfile, String learningGoal, String currentLevel) {
        String systemPrompt = """
                你是一个专业的教育顾问。请根据学生的当前水平和学习目标，生成个性化的学习路径。
                
                要求：
                1. 学习路径应包含3-5个主要阶段
                2. 每个阶段应有明确的学习目标和内容
                3. 提供推荐的学习资源
                4. 给出预计学习时长
                5. 考虑学生的学习风格和偏好
                
                请以JSON格式返回结果，包含以下字段：
                {
                    "pathName": "学习路径名称",
                    "description": "路径描述",
                    "estimatedDuration": 总预计时长（小时）,
                    "steps": [
                        {
                            "title": "步骤标题",
                            "description": "步骤描述",
                            "stepType": "LEARNING|PRACTICE|PROJECT|REVIEW",
                            "estimatedHours": 预计时长,
                            "resources": ["资源1", "资源2"]
                        }
                    ]
                }
                
                请只返回JSON，不要有其他内容。
                """;
        
        String userMessage = String.format(
                "学生档案: %s\n学习目标: %s\n当前水平: %s",
                studentProfile, learningGoal, currentLevel
        );
        
        return chat(systemPrompt, userMessage);
    }
    
    private boolean isApiEnabled() {
        return config.isEnabled() && config.getApiKey() != null && !config.getApiKey().isEmpty();
    }
    
    private DeepSeekResponse callApi(List<Message> messages, boolean stream) {
        WebClient webClient = webClientBuilder.baseUrl(config.getBaseUrl()).build();
        
        DeepSeekRequest request = new DeepSeekRequest();
        request.setModel(config.getModel());
        request.setMaxTokens(config.getMaxTokens());
        request.setTemperature(config.getTemperature());
        request.setStream(stream);
        request.setMessages(messages);
        
        return webClient.post()
                .uri("/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + config.getApiKey())
                .bodyValue(request)
                .retrieve()
                .bodyToMono(DeepSeekResponse.class)
                .block();
    }
    
    @Data
    private static class DeepSeekRequest {
        private String model;
        private List<Message> messages;
        @JsonProperty("max_tokens")
        private int maxTokens;
        private double temperature;
        private boolean stream;
    }
    
    @Data
    private static class Message {
        private String role;
        private String content;
        
        public Message(String role, String content) {
            this.role = role;
            this.content = content;
        }
    }
    
    @Data
    private static class DeepSeekResponse {
        private String id;
        private String object;
        private long created;
        private String model;
        private List<Choice> choices;
        private Usage usage;
    }
    
    @Data
    private static class Choice {
        private int index;
        private Message message;
        private Delta delta;
        @JsonProperty("finish_reason")
        private String finishReason;
    }
    
    @Data
    private static class Delta {
        private String role;
        private String content;
    }
    
    @Data
    private static class Usage {
        @JsonProperty("prompt_tokens")
        private int promptTokens;
        @JsonProperty("completion_tokens")
        private int completionTokens;
        @JsonProperty("total_tokens")
        private int totalTokens;
    }
    
    @Data
    private static class StreamResponse {
        private String id;
        private String object;
        private long created;
        private String model;
        private List<StreamChoice> choices;
    }
    
    @Data
    private static class StreamChoice {
        private int index;
        private Delta delta;
        @JsonProperty("finish_reason")
        private String finishReason;
    }
}
