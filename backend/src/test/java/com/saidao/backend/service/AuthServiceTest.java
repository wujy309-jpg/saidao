package com.saidao.backend.service;

import com.saidao.backend.dto.LoginRequest;
import com.saidao.backend.dto.LoginResponse;
import com.saidao.backend.entity.User;
import com.saidao.backend.entity.User.UserRole;
import com.saidao.backend.repository.UserRepository;
import com.saidao.backend.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private JwtUtil jwtUtil;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @Mock
    private LoginAttemptService loginAttemptService;
    
    @Mock
    private RefreshTokenService refreshTokenService;
    
    @Mock
    private AuditService auditService;
    
    @Mock
    private HttpServletRequest httpRequest;
    
    @InjectMocks
    private AuthService authService;
    
    private User testUser;
    private LoginRequest loginRequest;
    
    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setPassword("encodedPassword");
        testUser.setName("测试用户");
        testUser.setRole(UserRole.STUDENT);
        testUser.setEmail("test@example.com");
        
        loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");
        
        when(httpRequest.getHeader("X-Forwarded-For")).thenReturn(null);
        when(httpRequest.getHeader("X-Real-IP")).thenReturn(null);
        when(httpRequest.getRemoteAddr()).thenReturn("127.0.0.1");
    }
    
    @Test
    void login_Success() {
        when(loginAttemptService.isAccountLocked(anyString())).thenReturn(false);
        when(loginAttemptService.isIpBlocked(anyString())).thenReturn(false);
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(jwtUtil.generateToken(any(), anyString(), anyString())).thenReturn("test-token");
        
        LoginResponse response = authService.login(loginRequest, httpRequest);
        
        assertNotNull(response);
        assertEquals("test-token", response.getToken());
        assertEquals("testuser", response.getUser().getUsername());
        verify(loginAttemptService).resetAttempts("testuser");
        verify(auditService).logLogin(eq(1L), eq("testuser"), eq(true), isNull());
    }
    
    @Test
    void login_AccountLocked() {
        when(loginAttemptService.isAccountLocked(anyString())).thenReturn(true);
        
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.login(loginRequest, httpRequest);
        });
        
        assertEquals("账户已锁定，请稍后再试", exception.getMessage());
        verify(auditService).logLogin(isNull(), eq("testuser"), eq(false), eq("账户已锁定"));
    }
    
    @Test
    void login_WrongPassword() {
        when(loginAttemptService.isAccountLocked(anyString())).thenReturn(false);
        when(loginAttemptService.isIpBlocked(anyString())).thenReturn(false);
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
        when(loginAttemptService.getRemainingAttempts(anyString())).thenReturn(4);
        
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.login(loginRequest, httpRequest);
        });
        
        assertTrue(exception.getMessage().contains("用户名或密码错误"));
        verify(loginAttemptService).recordAttempt(eq("testuser"), eq("127.0.0.1"), eq(false), eq("密码错误"));
    }
    
    @Test
    void login_UserNotFound() {
        when(loginAttemptService.isAccountLocked(anyString())).thenReturn(false);
        when(loginAttemptService.isIpBlocked(anyString())).thenReturn(false);
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
        
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.login(loginRequest, httpRequest);
        });
        
        assertEquals("用户名或密码错误", exception.getMessage());
    }
    
    @Test
    void register_Success() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        
        User result = authService.registerStudent(testUser);
        
        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        verify(userRepository).save(any(User.class));
        verify(auditService).logCreate(eq(1L), eq("student"), eq("USER"), eq(1L), anyString());
    }
    
    @Test
    void register_DuplicateUsername() {
        when(userRepository.existsByUsername(anyString())).thenReturn(true);
        
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.registerStudent(testUser);
        });
        
        assertEquals("用户名已存在", exception.getMessage());
    }
}
