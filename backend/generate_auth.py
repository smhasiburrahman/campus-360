import os

base_dir = '/Users/rotenz3nsdigit/Campus360/Backend/src/main/java/com/campus360'
dto_dir = os.path.join(base_dir, 'dto')
security_dir = os.path.join(base_dir, 'security')
service_dir = os.path.join(base_dir, 'service')
controller_dir = os.path.join(base_dir, 'controller')
config_dir = os.path.join(base_dir, 'config')

os.makedirs(dto_dir, exist_ok=True)
os.makedirs(security_dir, exist_ok=True)
os.makedirs(service_dir, exist_ok=True)
os.makedirs(controller_dir, exist_ok=True)
os.makedirs(config_dir, exist_ok=True)

# 1. DTOs
dtos = {
    "AuthRequest.java": """package com.campus360.dto;
import lombok.Data;
@Data public class AuthRequest { private String email; private String password; }
""",
    "RegisterStudentRequest.java": """package com.campus360.dto;
import lombok.Data;
@Data public class RegisterStudentRequest { private String email; private String password; }
""",
    "AuthResponse.java": """package com.campus360.dto;
import lombok.Builder;
import lombok.Data;
@Data @Builder public class AuthResponse { private String token; private Long id; private Boolean onboardingComplete; private String role; }
""",
    "OnboardingRequest.java": """package com.campus360.dto;
import lombok.Data;
@Data public class OnboardingRequest { private String universityId; private String fullName; private Long departmentId; }
"""
}

for name, content in dtos.items():
    with open(os.path.join(dto_dir, name), 'w') as f: f.write(content)

# 2. Security Config & JWT Utils
jwt_utils = """package com.campus360.security;

import io.jsonwebtoken.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtils {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expirationMs}")
    private int jwtExpirationMs;

    public String generateToken(Long userId, String accountType, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("accountType", accountType);
        claims.put("role", role);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(String.valueOf(userId))
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(SignatureAlgorithm.HS512, jwtSecret)
                .compact();
    }

    public Claims getClaimsFromJwtToken(String token) {
        return Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token).getBody();
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(authToken);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}
"""

jwt_filter = """package com.campus360.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtils jwtUtils;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = parseJwt(request);
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                Claims claims = jwtUtils.getClaimsFromJwtToken(jwt);
                String userId = claims.getSubject();
                String accountType = claims.get("accountType", String.class);
                String role = claims.get("role", String.class);

                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                if (accountType != null) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + accountType.toUpperCase()));
                }
                if (role != null) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
                }

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userId, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            System.err.println("Cannot set user authentication: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        return null;
    }
}
"""

security_config = """package com.campus360.config;

import com.campus360.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> 
                auth.requestMatchers("/api/v1/auth/**").permitAll()
                    .requestMatchers("/api/v1/departments/**", "/api/v1/courses/**", "/api/v1/trimesters/**").permitAll()
                    .anyRequest().authenticated()
            );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("*")); // Update in prod
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
"""

with open(os.path.join(security_dir, 'JwtUtils.java'), 'w') as f: f.write(jwt_utils)
with open(os.path.join(security_dir, 'JwtAuthenticationFilter.java'), 'w') as f: f.write(jwt_filter)
with open(os.path.join(config_dir, 'SecurityConfig.java'), 'w') as f: f.write(security_config)

# 3. AuthService
auth_service = """package com.campus360.service;

import com.campus360.dto.AuthRequest;
import com.campus360.dto.AuthResponse;
import com.campus360.entity.Student;
import com.campus360.repository.StudentRepository;
import com.campus360.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    public AuthResponse registerStudent(AuthRequest request) {
        if (studentRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already in use");
        }

        Student student = new Student();
        student.setEmail(request.getEmail());
        student.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        // university id and fullname must be unique/not null per schema. Give dummy for now to be updated in onboarding.
        student.setUniversityId("TEMP-" + UUID.randomUUID().toString().substring(0, 8));
        student.setFullName("Pending Onboarding");
        student.setOnboardingComplete(false);
        student.setIsActive(true);

        Student saved = studentRepository.save(student);
        String token = jwtUtils.generateToken(saved.getId(), "STUDENT", null);

        return AuthResponse.builder()
                .token(token)
                .id(saved.getId())
                .onboardingComplete(saved.getOnboardingComplete())
                .build();
    }

    public AuthResponse loginStudent(AuthRequest request) {
        Student student = studentRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), student.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwtUtils.generateToken(student.getId(), "STUDENT", null);

        return AuthResponse.builder()
                .token(token)
                .id(student.getId())
                .onboardingComplete(student.getOnboardingComplete())
                .build();
    }
}
"""

student_repo_update = """package com.campus360.repository;

import com.campus360.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByEmail(String email);
}
"""

with open(os.path.join(service_dir, 'AuthService.java'), 'w') as f: f.write(auth_service)
with open(os.path.join(base_dir, 'repository', 'StudentRepository.java'), 'w') as f: f.write(student_repo_update)

# 4. AuthController
auth_controller = """package com.campus360.controller;

import com.campus360.dto.AuthRequest;
import com.campus360.dto.AuthResponse;
import com.campus360.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/students/register")
    public ResponseEntity<?> registerStudent(@RequestBody AuthRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerStudent(request));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/students/login")
    public ResponseEntity<?> loginStudent(@RequestBody AuthRequest request) {
        try {
            return ResponseEntity.ok(authService.loginStudent(request));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }
}
"""

with open(os.path.join(controller_dir, 'AuthController.java'), 'w') as f: f.write(auth_controller)

# 5. StudentController (Onboarding)
student_controller = """package com.campus360.controller;

import com.campus360.dto.OnboardingRequest;
import com.campus360.entity.Student;
import com.campus360.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/students")
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @PutMapping("/me/onboarding")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> completeOnboarding(@RequestBody OnboardingRequest request) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        Student student = studentRepository.findById(Long.parseLong(userId))
                .orElseThrow(() -> new RuntimeException("Student not found"));
                
        student.setUniversityId(request.getUniversityId());
        student.setFullName(request.getFullName());
        student.setDepartmentId(request.getDepartmentId());
        student.setOnboardingComplete(true);
        
        Student saved = studentRepository.save(student);
        return ResponseEntity.ok(saved);
    }
}
"""

with open(os.path.join(controller_dir, 'StudentController.java'), 'w') as f: f.write(student_controller)

print("Auth and Onboarding code generated successfully.")
