package com.campus360;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class Campus360Application {

	public static void main(String[] args) {
		SpringApplication.run(Campus360Application.class, args);
	}

}
