package com.campus360.service;

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

    @Autowired
    private com.campus360.repository.UniversityAuthorityRepository authorityRepository;

    public AuthResponse loginAuthority(AuthRequest request) {
        com.campus360.entity.UniversityAuthority auth = authorityRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Authority not found"));

        if (!passwordEncoder.matches(request.getPassword(), auth.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwtUtils.generateToken(auth.getId(), "AUTHORITY", "ROLE_" + auth.getRole().toUpperCase());

        return AuthResponse.builder()
                .token(token)
                .id(auth.getId())
                .role(auth.getRole().toUpperCase())
                .build();
    }
}
