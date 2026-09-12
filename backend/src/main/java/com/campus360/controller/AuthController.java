package com.campus360.controller;

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
    @PostMapping("/authority/login")
    public ResponseEntity<?> loginAuthority(@RequestBody AuthRequest request) {
        try {
            return ResponseEntity.ok(authService.loginAuthority(request));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }
}
