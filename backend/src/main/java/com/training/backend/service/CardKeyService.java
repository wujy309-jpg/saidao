package com.training.backend.service;

import com.training.backend.entity.CardKey;
import com.training.backend.entity.TokenPackage;
import com.training.backend.repository.CardKeyRepository;
import com.training.backend.repository.TokenPackageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 卡密批量生成/查询/导出
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CardKeyService {

    /** 去易混淆字符（无 0/O/1/I） */
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 16;
    private final SecureRandom random = new SecureRandom();

    private final CardKeyRepository cardKeyRepository;
    private final TokenPackageRepository packageRepository;

    /**
     * 按套餐批量生成卡密
     * @return 批次号
     */
    @Transactional
    public String generate(Long packageId, int count, String remark) {
        if (count < 1 || count > 500) {
            throw new IllegalArgumentException("单次生成数量需在 1-500 之间");
        }
        TokenPackage pkg = packageRepository.findById(packageId)
                .orElseThrow(() -> new IllegalArgumentException("套餐不存在"));
        String batchNo = "C" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + String.format("%03d", random.nextInt(1000));

        for (int i = 0; i < count; i++) {
            CardKey card = new CardKey();
            card.setCode(generateCode());
            card.setBatchNo(batchNo);
            card.setPackageId(pkg.getId());
            card.setPackageName(pkg.getName());
            card.setTokens(pkg.totalTokens());
            card.setStatus(CardKey.CardStatus.UNUSED);
            card.setRemark(remark);
            cardKeyRepository.save(card);
        }
        log.info("生成卡密批次 {} 共 {} 张（套餐:{}）", batchNo, count, pkg.getName());
        return batchNo;
    }

    public Page<CardKey> search(String batchNo, CardKey.CardStatus status, int page, int size) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(1, size), 100);
        String b = (batchNo == null || batchNo.isBlank()) ? null : batchNo.trim();
        return cardKeyRepository.search(b, status, PageRequest.of(p, s));
    }

    /** 导出某批次全部卡密（TXT，每行一张） */
    public String export(String batchNo) {
        List<CardKey> cards = cardKeyRepository.findByBatchNo(batchNo);
        if (cards.isEmpty()) throw new IllegalArgumentException("批次不存在或无卡密");
        return cards.stream().map(CardKey::getCode).collect(Collectors.joining("\r\n"));
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
