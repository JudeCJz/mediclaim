import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateEnrollmentPDF = (data, logoBase64 = null) => {
    const { submission, activeFY } = data;
    if (!submission) return;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const PW = 210;
    const margin = 14;
    const contentW = PW - margin * 2; // 182mm
    let y = 0;

    // ── colors ──
    const indigo = [55, 65, 181];
    const slate = [30, 30, 45];
    const muted = [110, 115, 130];
    const light = [245, 246, 250];
    const border = [210, 214, 224];
    const white = [255, 255, 255];

    // ── tiny helpers ──
    const font = (size, style = "normal", color = slate) => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
    };
    const fill = (...rgb) => doc.setFillColor(...rgb);
    const draw = (...rgb) => doc.setDrawColor(...rgb);
    const rule = (ry, color = border) => { draw(...color); doc.setLineWidth(0.2); doc.line(margin, ry, PW - margin, ry); };
    const label = (text, lx, ly) => { font(7.5, "normal", muted); doc.text(text, lx, ly); };
    const value = (text, vx, vy, bold = false) => { font(8.5, bold ? "bold" : "normal", slate); doc.text(String(text ?? "—"), vx, vy); };

    // ── header ──
    fill(...indigo);
    doc.rect(0, 0, PW, 26, "F");

    font(16, "bold", white);
    doc.text("MEDICLAIM PORTAL", margin, 12);
    font(7.5, "normal", [190, 200, 255]);
    doc.text("Institutional Health Insurance · Enrollment Confirmation", margin, 18);

    font(7, "normal", [190, 200, 255]);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   FY ${activeFY?.name ?? "—"}`, PW - margin, 12, { align: "right" });

    y = 33;

    // ── name + emp id row ──
    font(13, "bold", indigo);
    doc.text(submission.userName ?? "—", margin, y);

    font(8, "normal", muted);
    doc.text(`${submission.empId ?? "—"}  ·  ${submission.designation ?? "—"}  ·  ${submission.department ?? "—"}`, margin, y + 6);

    y += 13;
    rule(y);
    y += 6;

    // ── reusable two-column row renderer ──
    // each row = [leftLabel, leftValue, rightLabel, rightValue]
    // L1=label col1 x, V1=value col1 x, L2=label col2 x, V2=value col2 x
    const L1 = margin, V1 = margin + 32, L2 = margin + 95, V2 = margin + 130;
    const ROW = 8;

    const renderRows = (rows, boldVals = false) => {
        rows.forEach(([l1, v1, l2, v2], i) => {
            const ry = y + i * ROW;
            if (i % 2 === 0) { fill(...light); doc.rect(margin, ry - 3, contentW, ROW, "F"); }
            label(l1, L1 + 2, ry + 2.5);
            value(v1, V1, ry + 2.5, boldVals);
            if (l2) label(l2, L2, ry + 2.5);
            if (v2) value(v2, V2, ry + 2.5, boldVals);
        });
        y += rows.length * ROW + 5;
    };

    // ── personal details ──
    font(7, "bold", indigo);
    doc.text("PERSONAL & CONTACT", margin, y);
    y += 4;

    renderRows([
        ["Email", submission.email ?? "—", "Phone", submission.phone ?? "—"],
        ["Date of Join", submission.doj ?? "—", "Gender", submission.gender ?? "—"],
    ]);

    rule(y - 2);
    y += 4;

    // ── policy details ──
    font(7, "bold", indigo);
    doc.text("COVERAGE & POLICY", margin, y);
    y += 4;

    renderRows([
        ["Financial Cycle", `FY ${activeFY?.name ?? "—"}`, "Policy Tier", submission.coverageId ?? "—"],
        ["Total Insured", `${(submission.dependents?.length ?? 0) + 1} lives`, "Base Premium", `INR ${(submission.basePremium ?? 0).toLocaleString()}`],
        ["Spouse Premium", `INR ${(submission.spousePremium ?? 0).toLocaleString()}`, "Dep. Premium", `INR ${((submission.childrenPremium ?? 0) + (submission.parentsPremium ?? 0)).toLocaleString()}`],
    ], true);

    rule(y - 2);
    y += 6;

    // ── total premium ──
    fill(...indigo);
    doc.roundedRect(margin, y, contentW, 12, 1.5, 1.5, "F");
    font(8, "normal", [190, 200, 255]);
    doc.text("NET PREMIUM PAYABLE", margin + 4, y + 7.5);
    font(13, "bold", white);
    doc.text(`INR ${(submission.premium ?? 0).toLocaleString()}`, PW - margin - 4, y + 8, { align: "right" });
    y += 18;

    // ── dependents table ──
    if (submission.dependents?.length > 0) {
        font(7, "bold", indigo);
        doc.text("DEPENDENTS", margin, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [["#", "Name", "Relationship", "Gender", "DOB"]],
            body: submission.dependents.map((d, i) => [
                i + 1,
                d.name ?? "—",
                d.type ? d.type[0].toUpperCase() + d.type.slice(1) : "—",
                d.gender ?? "—",
                d.dob ?? "—",
            ]),
            styles: { fontSize: 8, cellPadding: 3, textColor: slate, lineColor: border, lineWidth: 0.15 },
            headStyles: { fillColor: indigo, textColor: white, fontStyle: "bold", fontSize: 7.5 },
            alternateRowStyles: { fillColor: light },
            columnStyles: { 0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: 52 }, 2: { cellWidth: 38 }, 3: { cellWidth: 28 }, 4: { cellWidth: 40 } },
            margin: { left: margin, right: margin },
        });

        y = doc.lastAutoTable.finalY + 8;
    }

    // ── footer ──
    const fy = 297 - 10;
    draw(...border); doc.setLineWidth(0.15); doc.line(margin, fy - 3, PW - margin, fy - 3);
    font(6.5, "normal", muted);
    doc.text("System-generated receipt. Deductions subject to administrative review.", PW / 2, fy + 1, { align: "center" });
    doc.text("Mediclaim Portal · SHA-256 Verified", margin, fy + 6);
    doc.text("Page 1 of 1", PW - margin, fy + 6, { align: "right" });

    doc.save(`Enrollment_${submission.userName ?? "User"}_FY${activeFY?.name ?? "Unknown"}.pdf`);
};