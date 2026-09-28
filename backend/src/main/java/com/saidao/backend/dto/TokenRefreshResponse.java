package com.saidao.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenRefreshResponse {
    
    private String token;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
}
