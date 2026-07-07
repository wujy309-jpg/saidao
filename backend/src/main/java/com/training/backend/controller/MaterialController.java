package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.dto.MaterialSubmitRequest;
import com.training.backend.dto.MaterialResponse;
import com.training.backend.entity.TrainingMaterial.MaterialStatus;
import com.training.backend.service.MaterialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 实训材料控制器
 */
@Slf4j
@RestController
@RequestMapping("/materials")
@RequiredArgsConstructor
public class MaterialController {
    
    private final MaterialService materialService;
    
    /**
     * 提交实训材料
     */
    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<MaterialResponse>> submitMaterial(
            @Valid @RequestPart("request") MaterialSubmitRequest request,
            @RequestPart("file") MultipartFile file,
            @RequestHeader("X-User-Id") Long userId) {
        log.info("用户 {} 提交材料: {}", userId, request.getTitle());
        MaterialResponse response = materialService.submitMaterial(request, file, userId);
        return ResponseEntity.ok(ApiResponse.success("材料提交成功", response));
    }
    
    /**
     * 获取用户的材料列表
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<MaterialResponse>>> getUserMaterials(@PathVariable Long userId) {
        List<MaterialResponse> materials = materialService.getUserMaterials(userId);
        return ResponseEntity.ok(ApiResponse.success(materials));
    }
    
    /**
     * 获取任务的材料列表
     */
    @GetMapping("/task/{taskId}")
    public ResponseEntity<ApiResponse<List<MaterialResponse>>> getTaskMaterials(@PathVariable Long taskId) {
        List<MaterialResponse> materials = materialService.getTaskMaterials(taskId);
        return ResponseEntity.ok(ApiResponse.success(materials));
    }
    
    /**
     * 获取材料详情
     */
    @GetMapping("/{materialId}")
    public ResponseEntity<ApiResponse<MaterialResponse>> getMaterial(@PathVariable Long materialId) {
        MaterialResponse material = materialService.getMaterial(materialId);
        return ResponseEntity.ok(ApiResponse.success(material));
    }
    
    /**
     * 更新材料状态
     */
    @PutMapping("/{materialId}/status")
    public ResponseEntity<ApiResponse<MaterialResponse>> updateMaterialStatus(
            @PathVariable Long materialId,
            @RequestParam MaterialStatus status,
            @RequestParam Long reviewerId,
            @RequestParam(required = false) String comment) {
        MaterialResponse response = materialService.updateMaterialStatus(materialId, status, reviewerId, comment);
        return ResponseEntity.ok(ApiResponse.success("状态更新成功", response));
    }
}
