package com.campus360.dto;
import lombok.Builder;
import lombok.Data;
@Data @Builder public class AuthResponse { private String token; private Long id; private Boolean onboardingComplete; private String role; }
