package com.sgic.exam.config;

import com.sgic.exam.model.Admin;
import com.sgic.exam.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (adminRepository.count() == 0) {
            Admin defaultAdmin = new Admin();
            defaultAdmin.setUsername("admin_user");
            defaultAdmin.setEmail("admin@sgic.com");
            defaultAdmin.setPassword(passwordEncoder.encode("admin123"));
            defaultAdmin.setName("System Admin");
            adminRepository.save(defaultAdmin);
            System.out.println("Default admin account created: admin_user / admin123");
        }
    }
}
