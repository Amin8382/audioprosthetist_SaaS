package com.odyio.noah;

import com.odyio.client.Client;
import com.odyio.client.ClientRepository;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.xml.sax.Attributes;
import org.xml.sax.helpers.DefaultHandler;

@Slf4j
@Service
@RequiredArgsConstructor
public class NoahXmlParser {

    private final ClientRepository clientRepository;

    public Map<String, Object> parse(InputStream inputStream) {
        List<Map<String, Object>> errors = new ArrayList<>();
        AtomicInteger created = new AtomicInteger(0);
        AtomicInteger updated = new AtomicInteger(0);
        AtomicInteger total = new AtomicInteger(0);

        try {
            SAXParserFactory factory = SAXParserFactory.newInstance();
            SAXParser saxParser = factory.newSAXParser();

            DefaultHandler handler = new DefaultHandler() {
                private StringBuilder currentValue = new StringBuilder();
                private String currentPatientId;
                private String currentFirstName;
                private String currentLastName;
                private String currentDob;
                private String currentPhone;
                private String currentAddress;
                private String currentEmail;
                private boolean inPatient = false;

                @Override
                public void startElement(String uri, String localName, String qName, Attributes attributes) {
                    currentValue.setLength(0);
                    if ("Patient".equals(qName) || "patient".equals(qName)) {
                        inPatient = true;
                        currentPatientId = attributes.getValue("id");
                        currentFirstName = null;
                        currentLastName = null;
                        currentDob = null;
                        currentPhone = null;
                        currentAddress = null;
                        currentEmail = null;
                    }
                }

                @Override
                public void characters(char[] ch, int start, int length) {
                    if (inPatient) currentValue.append(ch, start, length);
                }

                @Override
                public void endElement(String uri, String localName, String qName) {
                    String val = currentValue.toString().trim();
                    if (!inPatient) return;
                    switch (qName) {
                        case "FirstName": case "first_name": currentFirstName = val; break;
                        case "LastName": case "last_name": currentLastName = val; break;
                        case "BirthDate": case "birth_date": currentDob = val; break;
                        case "Phone": case "phone": currentPhone = val; break;
                        case "Address": case "address": currentAddress = val; break;
                        case "Email": case "email": currentEmail = val; break;
                    }
                    if (!("Patient".equals(qName) || "patient".equals(qName))) return;
                    inPatient = false;
                    total.incrementAndGet();
                    try {
                        String fullName = (currentFirstName != null ? currentFirstName + " " : "")
                                + (currentLastName != null ? currentLastName : "");
                        Optional<Client> existing = Optional.empty();
                        if (currentPatientId != null) {
                            existing = clientRepository.findByNoahPatientId(currentPatientId);
                        }
                        if (existing.isEmpty() && fullName.trim().length() > 1 && currentDob != null) {
                            existing = clientRepository.findByFullNameAndDateOfBirth(
                                fullName.trim(), parseDate(currentDob));
                        }
                        Client client;
                        if (existing.isPresent()) {
                            client = existing.get();
                            updated.incrementAndGet();
                        } else {
                            client = new Client();
                            client.setCreatedAt(Instant.now());
                            created.incrementAndGet();
                        }
                        client.setFullName(fullName.trim());
                        if (currentDob != null) client.setDateOfBirth(parseDate(currentDob));
                        if (currentPhone != null) client.setPhone(currentPhone);
                        if (currentAddress != null) client.setAddress(currentAddress);
                        if (currentEmail != null) client.setEmail(currentEmail);
                        if (currentPatientId != null) client.setNoahPatientId(currentPatientId);
                        client.setNoahSyncStatus("SYNCED");
                        client.setNoahLastSync(Instant.now());
                        client.setUpdatedAt(Instant.now());
                        clientRepository.save(client);
                    } catch (Exception e) {
                        Map<String, Object> err = new HashMap<>();
                        err.put("patientId", currentPatientId);
                        err.put("reason", e.getMessage());
                        errors.add(err);
                        log.warn("Error importing Noah patient {}: {}", currentPatientId, e.getMessage());
                    }
                }
            };
            saxParser.parse(inputStream, handler);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors du parsing du fichier Noah XML", e);
        }
        Map<String, Object> result = new HashMap<>();
        result.put("total", total.get());
        result.put("created", created.get());
        result.put("updated", updated.get());
        result.put("errors", errors);
        return result;
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        try {
            if (dateStr.contains("-")) return LocalDate.parse(dateStr);
            if (dateStr.contains("/")) {
                String[] parts = dateStr.split("/");
                if (parts.length == 3) {
                    return LocalDate.of(Integer.parseInt(parts[2]),
                        Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
                }
            }
            return LocalDate.parse(dateStr, DateTimeFormatter.BASIC_ISO_DATE);
        } catch (Exception e) {
            return null;
        }
    }
}
