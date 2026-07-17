package com.odyio.noah;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/noah")
@RequiredArgsConstructor
public class NoahImportController {

    private final NoahXmlParser noahXmlParser;
    private final ConcurrentHashMap<String, Map<String, Object>> progressStore = new ConcurrentHashMap<>();

    @PostMapping("/import-xml")
    public ResponseEntity<Map<String, Object>> importXml(@RequestParam MultipartFile file) {
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".xml")) {
            throw new IllegalArgumentException("Le fichier doit être au format XML");
        }

        try (InputStream is = file.getInputStream()) {
            Map<String, Object> result = noahXmlParser.parse(is);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de la lecture du fichier", e);
        }
    }

    @PostMapping("/import-xml/async")
    public ResponseEntity<Map<String, String>> importXmlAsync(@RequestParam MultipartFile file) {
        String jobId = UUID.randomUUID().toString();
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".xml")) {
            throw new IllegalArgumentException("Le fichier doit être au format XML");
        }

        final Map<String, Object> progress = new ConcurrentHashMap<>();
        progress.put("status", "PROCESSING");
        progress.put("current", 0);
        progress.put("total", 0);
        progress.put("currentPatient", "");
        progressStore.put(jobId, progress);

        String finalFilename = filename;
        Thread.startVirtualThread(() -> {
            try (InputStream is = file.getInputStream()) {
                Map<String, Object> result = noahXmlParser.parse(is);
                progress.putAll(result);
                progress.put("status", "DONE");
            } catch (Exception e) {
                progress.put("status", "ERROR");
                progress.put("error", e.getMessage());
            }
        });

        return ResponseEntity.ok(Map.of("jobId", jobId));
    }

    @GetMapping("/import-xml/progress/{jobId}")
    public SseEmitter getProgress(@PathVariable String jobId) {
        SseEmitter emitter = new SseEmitter(300000L);
        Map<String, Object> progress = progressStore.get(jobId);
        if (progress == null) {
            try { emitter.send(SseEmitter.event().data(Map.of("status", "NOT_FOUND"))); } catch (IOException ignored) {}
            emitter.complete();
            return emitter;
        }
        try {
            emitter.send(SseEmitter.event().data(progress));
            if ("DONE".equals(progress.get("status")) || "ERROR".equals(progress.get("status"))) {
                emitter.complete();
                progressStore.remove(jobId);
            } else {
                new Thread(() -> {
                    try {
                        for (int i = 0; i < 150; i++) {
                            Thread.sleep(1000);
                            Map<String, Object> current = progressStore.get(jobId);
                            if (current == null) break;
                            emitter.send(SseEmitter.event().data(current));
                            if ("DONE".equals(current.get("status")) || "ERROR".equals(current.get("status"))) {
                                progressStore.remove(jobId);
                                break;
                            }
                        }
                    } catch (Exception ignored) {}
                    try { emitter.complete(); } catch (Exception ignored) {}
                }).start();
            }
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
        return emitter;
    }
}
