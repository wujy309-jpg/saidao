package com.saidao.backend.controller;

import com.saidao.backend.billing.BillingContext;
import com.saidao.backend.billing.BillingContext.BillingSession;
import com.saidao.backend.billing.BillingContext.ChargeTicket;
import com.saidao.backend.billing.LlmResult;
import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.entity.AssistantMessage;
import com.saidao.backend.entity.AssistantSession;
import com.saidao.backend.entity.TokenScene;
import com.saidao.backend.service.AiBillingService;
import com.saidao.backend.service.AssistantService;
import com.saidao.backend.service.DeepSeekService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * AI 竞赛助手接口(需登录)
 */
@Slf4j
@RestController
@RequestMapping("/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;
    private final DeepSeekService deepSeekService;
    private final com.saidao.backend.service.DocumentService documentService;
    private final AiBillingService aiBillingService;

    /** 我的会话列表 */
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<AssistantSession>>> sessions() {
        return ResponseEntity.ok(ApiResponse.success(assistantService.listSessions(currentUserId())));
    }

    /** 会话历史消息 */
    @GetMapping("/sessions/{id}/messages")
    public ResponseEntity<ApiResponse<List<AssistantMessage>>> messages(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(assistantService.listMessages(currentUserId(), id)));
    }

    /** 删除会话 */
    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(@PathVariable Long id) {
        boolean ok = assistantService.deleteSession(currentUserId(), id);
        return ResponseEntity.ok(ok
                ? ApiResponse.success("已删除", null)
                : ApiResponse.error("会话不存在"));
    }

    /** 助手上下文(竞赛/规则/优秀作品/画像/团队/项目/备赛计划) */
    @GetMapping("/context/{competitionId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> context(@PathVariable Long competitionId) {
        Map<String, Object> data = assistantService.buildContextData(competitionId, currentUserId());
        if (data == null) return ResponseEntity.ok(ApiResponse.error("竞赛不存在"));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 流式对话(SSE):
     * 事件 start:{messageId} / delta:{content} / done:{messageId,sessionId,title} / degraded:{message} / error:{message}
     * 支持客户端中断(暂停):先落一条空占位回复消息,中断后由前端回写部分内容,续写走 /chat/continue
     *
     * <p>计费：SSE 走异步线程，AOP 兜不住，因此在控制器里显式「预留 → 结算/释放」。
     * 上游降级（返回空）时会发 degraded 事件并且<b>本次免扣</b>。
     */
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestBody Map<String, Object> body) {
        Long userId = currentUserId();
        Long competitionId = toLong(body.get("competitionId"));
        Long sessionId = toLong(body.get("sessionId"));
        String message = body.get("message") == null ? "" : String.valueOf(body.get("message")).trim();

        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
        if (competitionId == null || message.isEmpty()) {
            // 前置校验在扣费之前：这种请求不该产生任何计费记录
            send(emitter, "error", Map.of("message", "缺少竞赛或消息内容"));
            emitter.complete();
            return emitter;
        }

        ChargeTicket ticket = aiBillingService.charge(userId, TokenScene.ASSISTANT_CHAT);
        CompletableFuture.runAsync(() -> runChat(ticket, userId, competitionId, sessionId, message, emitter));
        return emitter;
    }

    /** 流式对话的异步主体（独立方法便于测试：早退必须退款） */
    public void runChat(ChargeTicket ticket, Long userId, Long competitionId, Long sessionId,
                 String message, SseEmitter emitter) {
        BillingSession session = aiBillingService.attach(ticket);
        try {
            AssistantSession chatSession = assistantService.getOrCreateSession(userId, competitionId, sessionId, message);
            assistantService.saveUserMessage(chatSession.getId(), message);

            // 先落空占位回复(供暂停回写与续写定位)
            AssistantMessage slot = assistantService.saveAssistantMessage(chatSession.getId(), "");
            send(emitter, "start", Map.of("messageId", slot.getId(), "sessionId", chatSession.getId()));

            String systemPrompt = assistantService.buildSystemPrompt(competitionId, userId);
            List<DeepSeekService.Message> history = assistantService.buildLlmHistory(userId, chatSession.getId());

            StringBuilder full = new StringBuilder();
            LlmResult result = deepSeekService.chatStreamResult(systemPrompt, history, 8192, delta ->
                    send(emitter, "delta", Map.of("content", delta)));

            boolean degraded = result.degraded() || !result.hasContent();
            if (degraded) {
                String reply = fallbackReply(systemPrompt, message);
                full.append(reply);
                send(emitter, "delta", Map.of("content", reply));
                aiBillingService.markDegraded(result.errorType() == null ? "LLM_EMPTY" : result.errorType());
            } else {
                full.append(result.content());
            }

            assistantService.updateAssistantMessage(slot.getId(), full.toString());

            aiBillingService.complete(session);
            if (session.degraded()) {
                send(emitter, "degraded", Map.of(
                        "message", "AI 服务暂不可用，本次未扣费",
                        "scene", TokenScene.ASSISTANT_CHAT.name()));
            }
            send(emitter, "done", Map.of(
                    "sessionId", chatSession.getId(),
                    "messageId", slot.getId(),
                    "title", chatSession.getTitle(),
                    "charged", session.degraded() ? 0 : session.ticket().amount()));
            emitter.complete();
        } catch (Exception e) {
            log.error("助手对话失败", e);
            aiBillingService.fail(session, e.getClass().getSimpleName());
            send(emitter, "error", Map.of(
                    "message", "生成失败,请稍后重试:" + e.getMessage(),
                    "charged", 0));
            emitter.complete();
        } finally {
            BillingContext.clear();
        }
    }

    /**
     * 续写被暂停的回复(SSE):从断点继续,不重复已写内容
     * 事件 start:{messageId} / delta:{content} / done:{messageId,sessionId}
     *
     * <p>会话/断点不存在时属于「早退」——此前扣了 10 Token 只回一句 error，现在会原路退回。
     */
    @PostMapping(value = "/chat/continue", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter continueChat(@RequestBody Map<String, Object> body) {
        Long userId = currentUserId();
        Long sessionId = toLong(body.get("sessionId"));
        Long messageId = toLong(body.get("messageId"));

        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
        if (sessionId == null || messageId == null) {
            send(emitter, "error", Map.of("message", "缺少会话或消息"));
            emitter.complete();
            return emitter;
        }

        ChargeTicket ticket = aiBillingService.charge(userId, TokenScene.ASSISTANT_CONTINUE);
        CompletableFuture.runAsync(() -> runContinue(ticket, userId, sessionId, messageId, emitter));
        return emitter;
    }

    /** 续写的异步主体（独立方法便于测试：会话不存在必须退款） */
    public void runContinue(ChargeTicket ticket, Long userId, Long sessionId, Long messageId, SseEmitter emitter) {
        BillingSession session = aiBillingService.attach(ticket);
        try {
            AssistantSession chatSession = assistantService.getSession(userId, sessionId);
            if (chatSession == null) {
                aiBillingService.fail(session, "SESSION_NOT_FOUND");
                send(emitter, "error", Map.of("message", "会话不存在", "charged", 0, "refunded", true));
                emitter.complete();
                return;
            }
            AssistantMessage paused = assistantService.getMessage(userId, sessionId, messageId);
            if (paused == null || paused.getContent() == null || paused.getContent().isBlank()) {
                aiBillingService.fail(session, "NO_CONTENT_TO_CONTINUE");
                send(emitter, "error", Map.of("message", "没有可继续的内容", "charged", 0, "refunded", true));
                emitter.complete();
                return;
            }

            String partial = paused.getContent();
            send(emitter, "start", Map.of("messageId", messageId, "sessionId", sessionId));

            String systemPrompt = assistantService.buildSystemPrompt(chatSession.getCompetitionId(), userId);
            List<DeepSeekService.Message> history =
                    assistantService.buildLlmHistoryExcluding(userId, sessionId, messageId);
            history.add(new DeepSeekService.Message("assistant", partial));
            history.add(new DeepSeekService.Message("user",
                    "请直接接着上面那条被截断的回复继续输出剩余内容:从断点处开始写,不要重复已写内容,不要任何开场白或解释。"));

            StringBuilder continuation = new StringBuilder();
            LlmResult result = deepSeekService.chatStreamResult(systemPrompt, history, 8192, delta ->
                    send(emitter, "delta", Map.of("content", delta)));

            if (result.degraded() || !result.hasContent()) {
                String reply = "\n\n(继续生成暂不可用,已保留已写内容)";
                continuation.append(partial).append(reply);
                send(emitter, "delta", Map.of("content", reply));
                aiBillingService.markDegraded(result.errorType() == null ? "LLM_EMPTY" : result.errorType());
            } else {
                continuation.append(partial).append(result.content());
            }

            assistantService.updateAssistantMessage(messageId, continuation.toString());

            aiBillingService.complete(session);
            if (session.degraded()) {
                send(emitter, "degraded", Map.of(
                        "message", "AI 服务暂不可用，本次未扣费",
                        "scene", TokenScene.ASSISTANT_CONTINUE.name()));
            }
            send(emitter, "done", Map.of(
                    "sessionId", sessionId,
                    "messageId", messageId,
                    "charged", session.degraded() ? 0 : session.ticket().amount()));
            emitter.complete();
        } catch (Exception e) {
            log.error("助手续写失败", e);
            aiBillingService.fail(session, e.getClass().getSimpleName());
            send(emitter, "error", Map.of(
                    "message", "续写失败,请稍后重试:" + e.getMessage(),
                    "charged", 0));
            emitter.complete();
        } finally {
            BillingContext.clear();
        }
    }

    /** 暂停回写:保存部分生成内容 */
    @PutMapping("/messages/{messageId}")
    public ResponseEntity<ApiResponse<Void>> savePartial(
            @PathVariable Long messageId, @RequestBody Map<String, String> body) {
        String content = body.getOrDefault("content", "");
        assistantService.updateMessageIfOwner(currentUserId(), messageId, content);
        return ResponseEntity.ok(ApiResponse.success("已保存", null));
    }

    // ==================== 我的资料(用户上传规则/要求/笔记) ====================

    @GetMapping("/documents")
    public ResponseEntity<ApiResponse<List<com.saidao.backend.entity.UserDocument>>> documents(
            @RequestParam Long competitionId) {
        List<com.saidao.backend.entity.UserDocument> list =
                documentService.list(currentUserId(), competitionId);
        list.forEach(d -> {
            d.setHasText(d.getContentText() != null && !d.getContentText().isBlank());
            d.setContentText(null); // 列表不下发全文
        });
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping(value = "/documents", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<com.saidao.backend.entity.UserDocument>> uploadDocument(
            @RequestParam Long competitionId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        com.saidao.backend.entity.UserDocument doc =
                documentService.upload(currentUserId(), competitionId, file);
        doc.setHasText(doc.getContentText() != null && !doc.getContentText().isBlank());
        doc.setContentText(null);
        return ResponseEntity.ok(ApiResponse.success("资料已上传,AI 会自动读取", doc));
    }

    @DeleteMapping("/documents/{docId}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long docId) {
        return ResponseEntity.ok(documentService.delete(currentUserId(), docId)
                ? ApiResponse.success("资料已删除", null)
                : ApiResponse.error("资料不存在"));
    }

    /** DeepSeek 未配置/调用失败时的降级回复 */
    private String fallbackReply(String systemPrompt, String message) {
        String topic = message.length() > 40 ? message.substring(0, 40) + "…" : message;
        return "抱歉,AI 服务暂不可用(未配置 DeepSeek API Key),我先给你一个通用建议:\n\n"
                + "1. 打开竞赛官网,以官方发布的赛制与评审标准为准;\n"
                + "2. 针对「" + topic + "」,建议先列出大纲,再逐节填充内容;\n"
                + "3. 参考平台「历年优秀作品」板块的选题与结构;\n\n"
                + "配置 DEEPSEEK_API_KEY 后,我就能结合完整竞赛上下文为你逐字生成了。";
    }

    private void send(SseEmitter emitter, String event, Map<String, Object> data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(data));
        } catch (Exception e) {
            log.debug("SSE 发送失败(客户端可能已断开): {}", e.getMessage());
        }
    }

    private Long toLong(Object o) {
        if (o == null) return null;
        try {
            return Long.valueOf(String.valueOf(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        throw new IllegalStateException("未登录");
    }
}
