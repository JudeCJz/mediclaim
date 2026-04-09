# Mediclaim Institutional Portal: System Inventory

This document provides an exhaustive inventory of all screens, components, fields, and logical functions within the Mediclaim Institutional Portal as of **April 9, 2026**.

---

## 🔐 1. Login Page
The entry point for all institutional members.

| Element | Type | Description / Behavior | Validation / Restrictions |
| :--- | :--- | :--- | :--- |
| **Institutional Logo** | Image | Displays the branding logo in a glow-boxed container. | N/A |
| **Portal Header** | Text | "Portal Login" (H1) and "Secure Institutional Management System." | N/A |
| **Email Address** | Input (Email) | Field for user identification. | Required. Format validation. |
| **Password** | Input (Password) | Field for secure access. | Required. |
| **Show/Hide Password** | Toggle Button | Eye icon that toggles password visibility. | N/A |
| **LOG IN Button** | Action Button | Submits credentials with a ripple effect and loader state. | Triggers auth logic. |
| **Error Banner** | Alert Modal | Red box indicating "Invalid credentials" or "Account Blocked." | Appears only on failure. |

---

## 🛡️ 2. Administrative Dashboard (Admin/HOD Persona)
Accessible to users with the `admin` or `hod` roles.

### A. Sidebar Navigation
*   **Overview:** Global statistics kiosk.
*   **Registry (Folders):** Enrollment explorer for all cycles.
*   **Faculty Accounts:** User management and onboarding.
*   **System Logs:** Audit trail of all portal actions.
*   **Settings:** Financial Year (Cycle) configuration and Security.
*   **Logout Button:** Clears JWT and redirects to Login.

### B. Registry Tab (The "Engine Room")
*   **Global Actions Bar (Top):**
    *   **SEND BULK EMAIL:** Opens a modal to send mass enrollment reminders.
    *   **BROADCAST ANNOUNCEMENT:** (Megaphone Icon) Immediately dispatches a "Cycle Open" email to all active faculty for the current session.
    *   **GLOBAL EXPORT:** Downloads a single CSV containing EVERY enrollment across all history.
*   **Cycle Folder Layout:**
    *   **Header:** Displays "FY [Name]", "Active/Closed" badge, and "Record Count."
    *   **Export Icon (Individual):** Downloads a CSV specifically for that financial cycle.
    *   **Unlock/Lock Icon:** Visual indicator if the cycle is currently open for submissions.
*   **Claims Registry Table (Inside Folder):**
    *   **Member:** Full Name + Email.
    *   **ID / Bio:** Employee ID + Gender + DOJ.
    *   **Dept / Designation:** Institutional department and role.
    *   **Coverage Config:** Selected plan label + count of dependents covered.
    *   **Total Premium:** The final calculated amount payable.
    *   **Action: Print Confirmation:** (Envelope Icon) Resends the enrollment receipt to the user.
    *   **Action: Delete:** (Trash Icon) Removes the specific enrollment record.

### C. Faculty Accounts Tab
*   **Bulk Import Area:** Large text area for batching users (Format: Name, Dept, Email).
*   **Search Bar:** Filters the user list by Name or Email in real-time.
*   **User Table:**
    *   Columns: Member (Name/Email), Dept, Status Toggle.
    *   **Status Toggle:** A switch to "Enable" or "Disable" user access instantly.

### D. Settings & Cycle Management
*   **Create/Edit Cycle Modal:**
    *   **Identifier:** Name of the FY (e.g., 2026-2027).
    *   **Deadline:** Submission cutoff date picker.
    *   **Policy Plans:** Add/Remove coverage tiers with specific base premiums.
    *   **Dependency Rules:** Toggles for Spouse, Child (max limit), and Parents (max limit).
    *   **Premium Add-ons:** Fields for extra premium per dependent type.
    *   **Document Rules:** Toggle to require Gov ID or Passport Photo.
*   **Security Settings:** Password update form (Current, New, Confirm).

---

## 🎓 3. Faculty Dashboard (User Persona)
The interface for general staff members.

### A. Global Headers & Indicators
*   **Active Session Banner:** Persistent bar at the top showing "FY [Name]" (synchronized via `activeFY` state).
*   **PWA Install Prompt:** Sticky bottom banner for "Add to Home Screen" on mobile devices.

### B. Session Picker (Dashboard Home)
*   **Cycle Cards:** High-density cards for each financial year.
    *   **Indicators:** "AVAILABLE" (Green), "ENROLLED" (Blue), or "CLOSED" (Red/Grey).
    *   **Actions:** "ENTER" (Fill new), "EDIT" (Modify existing), or "VIEW" (Read-only for closed cycles).
    *   **Receipt Shortcut:** "PRINT RECEIPT" (Printer icon) available immediately on enrolled cards.

### C. Enrollment Form (The Multi-Step Interface)
1.  **Member Profile Section:**
    *   **Fields:** Full Name, Emp ID, Phone, Dept (Auto-Uppercase), Designation, Gender, DOJ.
    *   **Behavior:** Auto-fills from "Master Profile" (Settings) on first entry. All fields marked with red `*`.
2.  **Policy Selection Section:**
    *   **Grid Cards:** Selectable cards for each coverage tier (e.g., 2 Lakhs, 5 Lakhs).
    *   **Live Premium Estimator:** Floating dashboard widget that updates the total premium in real-time as you select plans and add dependents.
3.  **Family Members (Dependents):**
    *   **Dynamic Buttons:** "Add Spouse", "Add Child", "Add Parent" (Respects institutional limits).
    *   **Dependent Form:** Name, Relation, Gender, DOB.
    *   **Logic:** Auto-calculates age based on DOB; disallows extra dependents beyond cycle limits.
4.  **Documents Upload:**
    *   **Slots:** "Government ID" and "Passport Photo".
    *   **Status:** Shows "VERIFIED" or "UPLOADED" badges once files are chosen.
5.  **Submission Controls:**
    *   **Submit/Update Button:** Triggers an **Exhaustive Validation Scan**.
    *   **Validation Alert:** Lists every missing field explicitly if validation fails.

---

## 📜 4. Enrollment History
A dedicated view for finalized records.

*   **Registry Cards:** Summarized view of all past enrollment cycles.
*   **PDF Receipt Generator:** (jspdf) Dynamic button to generate a professional PDF receipt containing all policy details, covered dependents, and total premium.

---

## ⚙️ 5. Shared / Global Logic

| Feature | Description |
| :--- | :--- |
| **Master Profile (Settings)** | Allows users to save institutional data once. Automatically populates all future enrollment forms. |
| **AlertModal** | The standard "Pop" animation dialog used for all Confirmations, Success messages, and Errors. |
| **Mobile-First Responsiveness** | Entire layout uses `clamp()` and flex-wrap to adapt to Android/iOS aspect ratios. |
| **CalculatePremium()** | A unified logic function shared by the form and the live estimator to ensure financial accuracy. |
| **JWT Persistence** | Authentication is maintained via LocalStorage and verified by the `useApp` hook globally. |
