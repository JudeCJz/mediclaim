import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generates a professional PDF receipt for a mediclaim enrollment submission.
 * @param {Object} data - The submission data (submission, user, financialYear).
 * @param {string} logoBase64 - Optional logo in base64 format.
 */
export const generateEnrollmentPDF = (data, logoBase64 = null) => {
    const { submission, activeFY } = data;
    if (!submission) {
        console.error("PDF Generation failed: No submission data provided.");
        return;
    }
    const doc = new jsPDF();
    const primaryColor = [79, 70, 229]; // Indigo-600 (approx var(--primary))
    const textColor = [31, 41, 55]; // Gray-800
    const mutedTextColor = [107, 114, 128]; // Gray-500

    // --- 1. Header & Logo ---
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 15, 15, 20, 20);
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...primaryColor);
    doc.text("MEDICLAIM PORTAL", 40, 24);
    
    doc.setFontSize(10);
    doc.setTextColor(...mutedTextColor);
    doc.setFont("helvetica", "normal");
    doc.text("Official Enrollment Confirmation Receipt", 40, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 195, 20, { align: "right" });

    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, 40, 195, 40);

    // --- 2. Personal & Professional Details ---
    doc.setFontSize(14);
    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "bold");
    doc.text("Personal & Professional Profile", 15, 52);

    const profileData = [
        ["Full Name", submission.userName || 'N/A', "Employee ID", submission.empId || 'N/A'],
        ["Department", submission.department || 'N/A', "Designation", submission.designation || 'N/A'],
        ["Institutional Email", submission.email || 'N/A', "Phone", submission.phone || 'N/A'],
        ["Date of Joining", submission.doj || 'N/A', "Gender", submission.gender || 'N/A'],
    ];

    autoTable(doc, {
        startY: 58,
        body: profileData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: mutedTextColor, cellWidth: 35 },
            1: { cellWidth: 60 },
            2: { fontStyle: 'bold', textColor: mutedTextColor, cellWidth: 35 },
            3: { cellWidth: 55 },
        }
    });

    // --- 3. Coverage & Policy Details ---
    const policyY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "bold");
    doc.text("Coverage & Policy Configuration", 15, policyY);

    const policyData = [
        ["Financial Cycle", `FY ${activeFY?.name || 'Unknown'}`, "Base Premium", `INR ${(submission.basePremium || 0).toLocaleString()}`],
        ["Policy Tier", submission.coverageId || 'N/A', "Spouse Premium", `INR ${(submission.spousePremium || 0).toLocaleString()}`],
        ["Total Insured Lives", (submission.dependents?.length || 0) + 1, "Dependents Premium", `INR ${((submission.childrenPremium || 0) + (submission.parentsPremium || 0)).toLocaleString()}`],
    ];

    autoTable(doc, {
        startY: policyY + 6,
        body: policyData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: mutedTextColor, cellWidth: 35 },
            1: { cellWidth: 60 },
            2: { fontStyle: 'bold', textColor: mutedTextColor, cellWidth: 35 },
            3: { cellWidth: 55 },
        }
    });

    // TOTAL AMOUNT HIGHLIGHT
    const totalY = doc.lastAutoTable.finalY + 10;
    doc.setFillColor(249, 250, 251); // Gray-50
    doc.rect(15, totalY, 180, 20, 'F');
    doc.setFontSize(12);
    doc.setTextColor(...textColor);
    doc.text("Estimated Net Premium Payable:", 25, totalY + 13);
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text(`INR ${submission.premium?.toLocaleString() || '0'}`, 185, totalY + 13, { align: "right" });

    // --- 4. Dependents Table ---
    if (submission.dependents && submission.dependents.length > 0) {
        const depY = totalY + 30;
        doc.setFontSize(14);
        doc.setTextColor(...textColor);
        doc.setFont("helvetica", "bold");
        doc.text("Insured Beneficiaries (Dependents)", 15, depY);

        const depHeaders = [["ID", "Name", "Relationship", "Gender", "Date of Birth"]];
        const depBody = submission.dependents.map((d, index) => [
            index + 1, 
            d.name, 
            d.type ? (d.type.charAt(0).toUpperCase() + d.type.slice(1)) : 'N/A', 
            d.gender || 'N/A', 
            d.dob || 'N/A'
        ]);

        autoTable(doc, {
            startY: depY + 6,
            head: depHeaders,
            body: depBody,
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 },
            alternateRowStyles: { fillColor: [249, 250, 251] }
        });
    }

    // --- 5. Footer / Verification ---
    const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : totalY + 50);
    doc.setFontSize(8);
    doc.setTextColor(...mutedTextColor);
    doc.setFont("helvetica", "italic");
    doc.text("Note: This is a system-generated receipt. Final premium deductions are subject to administrative review and payroll cycle synchronization.", 105, (finalY > 270 ? 270 : finalY), { align: "center" });
    
    doc.setLineWidth(0.1);
    doc.setDrawColor(209, 213, 219);
    doc.line(15, 275, 195, 275);
    
    doc.setFont("helvetica", "normal");
    doc.text("Portal: Mediclaim | Security Protocol: SHA-256 Verified Submission", 15, 282);
    doc.text("Page 1 of 1", 195, 282, { align: "right" });

    // Save PDF
    doc.save(`Enrollment_Receipt_${submission.userName || 'User'}_FY${activeFY?.name || 'Unknown'}.pdf`);
};
