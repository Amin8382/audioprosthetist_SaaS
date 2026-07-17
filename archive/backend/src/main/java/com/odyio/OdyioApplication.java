package com.odyio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class OdyioApplication {
    public static void main(String[] args) {
        SpringApplication.run(OdyioApplication.class, args);
    }
}
