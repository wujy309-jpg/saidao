package com.training.backend.entity;

/**
 * AI 付费场景枚举（key 与 token_scene_config.scene 对应，单价后台可调）
 */
public enum TokenScene {

    ASSISTANT_CHAT("AI 助手对话", 20),
    ASSISTANT_CONTINUE("AI 助手续写", 10),
    PLAN_GENERATE("备赛计划生成", 30),
    PLAN_STREAM("备赛计划流式生成", 30),
    PLAN_ADJUST("备赛计划调整", 10),
    TASK_SWAP("计划任务换一个", 5),
    RECOMMEND("竞赛智能推荐", 15),
    FORUM_POLISH("论坛 AI 润色", 5),
    FORUM_SUGGEST("论坛 AI 建议", 5);

    private final String label;
    private final long defaultPrice;

    TokenScene(String label, long defaultPrice) {
        this.label = label;
        this.defaultPrice = defaultPrice;
    }

    public String getLabel() {
        return label;
    }

    /** 默认单价（数据库未配置时兜底） */
    public long getDefaultPrice() {
        return defaultPrice;
    }
}
