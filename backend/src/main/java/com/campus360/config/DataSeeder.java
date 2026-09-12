package com.campus360.config;

import com.campus360.entity.UniversityAuthority;
import com.campus360.repository.UniversityAuthorityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UniversityAuthorityRepository authorityRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (authorityRepository.findByEmail("admin@campus360.edu").isEmpty()) {
            UniversityAuthority admin = new UniversityAuthority();
            admin.setEmail("admin@campus360.edu");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setFullName("Super Admin");
            admin.setDesignation("System Administrator");
            admin.setRole("admin");
            admin.setIsActive(true);
            authorityRepository.save(admin);
            System.out.println("Seeded initial admin account: admin@campus360.edu / admin123");
        }
    }
}
