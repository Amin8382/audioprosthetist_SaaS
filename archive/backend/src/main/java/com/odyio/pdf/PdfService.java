package com.odyio.pdf;

import com.odyio.config.ClinicConfig;
import com.odyio.config.ClinicConfigRepository;
import com.odyio.facturation.Facture;
import com.odyio.facturation.Paiement;
import com.odyio.fournisseur.BonCommande;
import com.odyio.fournisseur.BCLigne;
import com.odyio.tresorerie.TresorerieMouvement;
import com.odyio.vente.BonLivraison;
import com.odyio.vente.BLLigne;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.TextAlignment;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PdfService {

    private final ClinicConfigRepository configRepository;

    private ClinicConfig getConfig() {
        return configRepository.findFirstByOrderById()
                .orElseThrow(() -> new RuntimeException("Clinic not configured"));
    }

    private void addHeader(Document doc, String title) {
        ClinicConfig cfg = getConfig();
        doc.add(new Paragraph(cfg.getClinicName() != null ? cfg.getClinicName() : "Clinique")
                .setFontSize(16).setBold());
        if (cfg.getAddress() != null) doc.add(new Paragraph(cfg.getAddress()).setFontSize(9));
        if (cfg.getPhone() != null) doc.add(new Paragraph("Tél: " + cfg.getPhone()).setFontSize(9));
        if (cfg.getTvaNumber() != null) doc.add(new Paragraph("Matricule TVA: " + cfg.getTvaNumber()).setFontSize(9));
        doc.add(new Paragraph(""));
        doc.add(new Paragraph(title).setFontSize(14).setBold().setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(""));
    }

    private Table infoTable(String[][] rows) {
        Table t = new Table(new float[]{2, 5}).setWidth(UnitValue.createPercentValue(100));
        for (String[] r : rows) {
            t.addCell(new Cell().add(new Paragraph(r[0]).setBold().setFontSize(9)).setBorder(null));
            t.addCell(new Cell().add(new Paragraph(r[1] != null ? r[1] : "-").setFontSize(9)).setBorder(null));
        }
        return t;
    }

    private Table lineTable(String[] headers, String[][] rows) {
        Table t = new Table(headers.length == 0 ? new float[]{1} : null)
                .setWidth(UnitValue.createPercentValue(100));
        if (headers.length > 0) {
            for (String h : headers) {
                t.addHeaderCell(new Cell().add(new Paragraph(h).setBold().setFontSize(8))
                        .setTextAlignment(TextAlignment.CENTER));
            }
        }
        for (String[] row : rows) {
            for (String cell : row) {
                t.addCell(new Cell().add(new Paragraph(cell).setFontSize(8))
                        .setTextAlignment(TextAlignment.CENTER));
            }
        }
        return t;
    }

    public byte[] generateBlPdf(BonLivraison bl, List<BLLigne> lignes) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdf = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdf);
        addHeader(doc, "Bon de Livraison N° " + bl.getNumero());

        doc.add(infoTable(new String[][]{
            {"Client:", bl.getClient() != null ? bl.getClient().getFullName() : "-"},
            {"Date:", bl.getDateBl() != null ? bl.getDateBl().toString() : "-"},
            {"Type:", bl.getType()},
            {"Statut:", bl.getStatus()}
        }));

        doc.add(new Paragraph(""));
        String[][] rows = lignes.stream().map(l -> {
            BigDecimal lineTotal = l.getUnitPriceHt().multiply(l.getQuantity());
            return new String[]{
                l.getDescription(),
                l.getQuantity().toString(),
                l.getUnitPriceHt().toString() + " TND",
                lineTotal + " TND"
            };
        }).toArray(String[][]::new);
        doc.add(lineTable(new String[]{"Description", "Qté", "Prix HT", "Total HT"}, rows));

        doc.add(new Paragraph(""));
        doc.add(new Paragraph("Total HT: " + bl.getTotalHt() + " TND").setFontSize(10));
        doc.add(new Paragraph("TVA (" + bl.getTvaRate() + "%): " +
                (bl.getTotalTtc() != null && bl.getTotalHt() != null
                        ? bl.getTotalTtc().subtract(bl.getTotalHt()) : "0.00") + " TND").setFontSize(10));
        doc.add(new Paragraph("Total TTC: " + bl.getTotalTtc() + " TND").setBold().setFontSize(11));
        doc.close();
        return baos.toByteArray();
    }

    public byte[] generateFacturePdf(Facture facture, List<Paiement> paiements) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdf = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdf);
        addHeader(doc, "Facture N° " + facture.getNumero());

        doc.add(infoTable(new String[][]{
            {"Client:", facture.getClient() != null ? facture.getClient().getFullName() : "-"},
            {"Date:", facture.getDateFacture() != null ? facture.getDateFacture().toString() : "-"},
            {"Échéance:", facture.getDateEcheance() != null ? facture.getDateEcheance().toString() : "-"},
            {"Statut:", facture.getStatus()}
        }));

        doc.add(new Paragraph(""));
        doc.add(new Paragraph("Total HT: " + facture.getTotalHt() + " TND").setFontSize(10));
        doc.add(new Paragraph("TVA: " + facture.getMontantTva() + " TND").setFontSize(10));
        doc.add(new Paragraph("Total TTC: " + facture.getTotalTtc() + " TND").setBold().setFontSize(11));
        doc.add(new Paragraph("Payé: " + facture.getMontantPaye() + " TND").setFontSize(10));
        doc.add(new Paragraph("Reste à payer: " + facture.getResteAPayer() + " TND")
                .setBold().setFontSize(11));

        if (paiements != null && !paiements.isEmpty()) {
            doc.add(new Paragraph(""));
            doc.add(new Paragraph("Historique des paiements:").setBold().setFontSize(10));
            String[][] pRows = paiements.stream().map(p -> new String[]{
                p.getDatePaiement() != null ? p.getDatePaiement().toString() : "-",
                p.getMontant() + " TND",
                p.getModePaiement(),
                p.getReference() != null ? p.getReference() : "-"
            }).toArray(String[][]::new);
            doc.add(lineTable(new String[]{"Date", "Montant", "Mode", "Référence"}, pRows));
        }
        doc.close();
        return baos.toByteArray();
    }

    public byte[] generateBcPdf(BonCommande bc, List<BCLigne> lignes) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdf = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdf);
        addHeader(doc, "Bon de Commande N° " + bc.getNumero());

        doc.add(infoTable(new String[][]{
            {"Fournisseur:", bc.getFournisseur() != null ? bc.getFournisseur().getName() : "-"},
            {"Date:", bc.getDateCommande() != null ? bc.getDateCommande().toString() : "-"},
            {"Statut:", bc.getStatus()}
        }));

        doc.add(new Paragraph(""));
        String[][] rows = lignes.stream().map(l -> {
            BigDecimal lineTotal = l.getUnitPriceHt().multiply(BigDecimal.valueOf(l.getQuantity()));
            return new String[]{
                l.getDescription(),
                String.valueOf(l.getQuantity()),
                l.getUnitPriceHt() != null ? l.getUnitPriceHt() + " TND" : "-",
                lineTotal + " TND"
            };
        }).toArray(String[][]::new);
        doc.add(lineTable(new String[]{"Description", "Qté", "Prix HT", "Total HT"}, rows));

        doc.add(new Paragraph(""));
        doc.add(new Paragraph("Total HT: " + bc.getTotalHt() + " TND").setBold().setFontSize(11));
        doc.close();
        return baos.toByteArray();
    }

    public byte[] generateBordereauPdf(List<TresorerieMouvement> mouvements, LocalDate start, LocalDate end) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdf = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdf);
        addHeader(doc, "Bordereau de Trésorerie");

        doc.add(new Paragraph("Période: " + start + " — " + end).setFontSize(10));
        doc.add(new Paragraph(""));

        BigDecimal runningTotal = BigDecimal.ZERO;
        String[][] rows = new String[mouvements.size()][];
        for (int i = 0; i < mouvements.size(); i++) {
            TresorerieMouvement m = mouvements.get(i);
            BigDecimal amount = m.getMontant() != null ? m.getMontant() : BigDecimal.ZERO;
            if ("RECETTE".equals(m.getType())) runningTotal = runningTotal.add(amount);
            else runningTotal = runningTotal.subtract(amount);
            rows[i] = new String[]{
                m.getDateMouvement() != null ? m.getDateMouvement().toString() : "-",
                m.getType(),
                m.getCategorie() != null ? m.getCategorie() : "-",
                (m.getType() != null && "RECETTE".equals(m.getType()) ? amount.toString() : "-") + " TND",
                (m.getType() != null && "DEPENSE".equals(m.getType()) ? amount.toString() : "-") + " TND",
                runningTotal + " TND"
            };
        }
        doc.add(lineTable(new String[]{"Date", "Type", "Catégorie", "Recettes", "Dépenses", "Solde"}, rows));

        BigDecimal recettes = BigDecimal.ZERO;
        BigDecimal depenses = BigDecimal.ZERO;
        for (TresorerieMouvement m : mouvements) {
            BigDecimal amt = m.getMontant() != null ? m.getMontant() : BigDecimal.ZERO;
            if ("RECETTE".equals(m.getType())) recettes = recettes.add(amt);
            else depenses = depenses.add(amt);
        }
        doc.add(new Paragraph(""));
        doc.add(new Paragraph("Total Recettes: " + recettes + " TND").setFontSize(10).setBold());
        doc.add(new Paragraph("Total Dépenses: " + depenses + " TND").setFontSize(10).setBold());
        doc.add(new Paragraph("Solde: " + recettes.subtract(depenses) + " TND").setFontSize(11).setBold());
        doc.close();
        return baos.toByteArray();
    }
}
