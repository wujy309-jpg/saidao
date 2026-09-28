package com.saidao.backend.config;

import com.saidao.backend.entity.BillingSetting;
import com.saidao.backend.entity.TokenPackage;
import com.saidao.backend.entity.TokenScene;
import com.saidao.backend.entity.TokenSceneConfig;
import com.saidao.backend.repository.BillingSettingRepository;
import com.saidao.backend.repository.TokenPackageRepository;
import com.saidao.backend.repository.TokenSceneConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * 计费种子数据：场景定价 / 默认套餐 / 平台设置（仅首次初始化，不覆盖已有配置）
 */
@Slf4j
@Component
@RequiredArgsConstructor
@Order(2)
public class BillingDataInitializer implements CommandLineRunner {

    private final TokenSceneConfigRepository sceneConfigRepository;
    private final TokenPackageRepository packageRepository;
    private final BillingSettingRepository billingSettingRepository;

    @Override
    public void run(String... args) {
        initScenes();
        initPackages();
        initSettings();
    }

    private void initScenes() {
        if (sceneConfigRepository.count() > 0) return;
        for (TokenScene scene : TokenScene.values()) {
            TokenSceneConfig cfg = new TokenSceneConfig();
            cfg.setScene(scene.name());
            cfg.setLabel(scene.getLabel());
            cfg.setPrice(scene.getDefaultPrice());
            cfg.setEnabled(true);
            cfg.setSortOrder(scene.ordinal());
            sceneConfigRepository.save(cfg);
        }
        log.info("已初始化 {} 个 AI 场景定价", TokenScene.values().length);
    }

    private void initPackages() {
        if (packageRepository.count() > 0) return;
        addPackage("新手包", "小额体验，适合试试 AI 助手", "6", 600, 0, 1);
        addPackage("体验包", "常用之选，赠送 100 Token", "12", 1300, 100, 2);
        addPackage("进阶包", "备赛期主力，赠送 500 Token", "30", 3500, 500, 3);
        addPackage("备赛包", "整个备赛期够用，赠送 1700 Token", "68", 8500, 1700, 4);
        addPackage("冲刺包", "团队共用，赠送 5200 Token", "128", 18000, 5200, 5);
        log.info("已初始化默认充值套餐");
    }

    private void addPackage(String name, String desc, String price, long tokens, long bonus, int sort) {
        TokenPackage pkg = new TokenPackage();
        pkg.setName(name);
        pkg.setDescription(desc);
        pkg.setPriceYuan(new BigDecimal(price));
        pkg.setTokens(tokens);
        pkg.setBonusTokens(bonus);
        pkg.setEnabled(true);
        pkg.setSortOrder(sort);
        packageRepository.save(pkg);
    }

    private void initSettings() {
        if (billingSettingRepository.existsById(1L)) return;
        BillingSetting s = new BillingSetting();
        s.setId(1L);
        s.setDailyFreeTokens(5);
        s.setRegisterBonusTokens(50);
        s.setFreeQuotaEnabled(true);
        s.setPaymentNote("转账时请备注订单号（O 开头），转账后联系管理员确认到账；也可直接找管理员购买卡密。");
        billingSettingRepository.save(s);
        log.info("已初始化平台计费设置");
    }
}
