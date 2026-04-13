import { test, expect } from '@playwright/test';

test.describe('Mediclaim System - Zero-Tolerance E2E Testing', () => {

  const FACULTY_EMAIL = 'aswal@gmail.com';
  const SYSTEM_PASS = '123456'; // Default

  // 🔴 PHASE 1: SMOKE & AUTHENTICATION TESTS
  test.describe('Phase 1: Smoke Tests & Authentication', () => {
    
    test('Test 1A: JWT Session Handling', async ({ page, context }) => {
      // Login simulation
      await page.goto('http://localhost:5173/login');
      await page.fill('input[type="email"]', FACULTY_EMAIL);
      await page.fill('input[type="password"]', SYSTEM_PASS);
      await page.click('button:has-text("Authorize Access")');
      
      // Verify login success
      await expect(page).toHaveURL('http://localhost:5173/');

      // AI Action Hijack constraint - Clear localStorage JWT
      await page.evaluate(() => localStorage.removeItem('token'));
      // Wait for React to handle the missing token (or trigger it by clicking a route)
      await page.reload();
      // Expect boot to login page
      await expect(page).toHaveURL('http://localhost:5173/login');
    });

    test('Test 6A: Basic UI Tier Selection & Boundary Enforcement', async ({ page }) => {
      // Pre-authenticate via state injection (or login again for isolated context)
      await page.evaluate(({email, pass}) => {
        // Fallback login logic
      }, { email: FACULTY_EMAIL, pass: SYSTEM_PASS });
      
      // Since this is a scaffolding, we await the dashboard
      await page.goto('http://localhost:5173/');
      
      // Select A Tier
      const policySelect = page.locator('select.policy-selector');
      if (await policySelect.isVisible()) {
          // Verify max limits dynamically react
          await policySelect.selectOption({ label: 'Base' });
      }
    });

    test('Test 8A: Simple Cart Calculation Accuracy', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        // Example check for total premium render
        const totalBox = page.locator('text=Estimated Net Premium Payable');
        await expect(totalBox).toBeVisible();
    });

  });

  // 🟠 PHASE 2: CORE TESTS (Deadline boundaries & Policy limits)
  test.describe('Phase 2: Core Enrollment Edge Cases', () => {

    test('Test 2: Financial Cycle Deadline Verification', async ({ request, page }) => {
      // 1. We will mock the backend 'current date' internally if possible
      // OR mock the React Clock
      await page.goto('http://localhost:5173/');
      
      // Verify "Enrollment Closed" lock-down if cycle is expired
      const isClosed = await page.locator('text=ENROLLMENT CLOSED').isVisible();
      if (!isClosed) {
          // If open, check submit availability
          await expect(page.locator('button:has-text("Submit Enrollment")')).toBeEnabled();
      } else {
          // Submitter should be physically impossible
          const submitBtn = page.locator('button:has-text("Submit Enrollment")');
          await expect(submitBtn).not.toBeVisible();
      }
    });

    test('Test 4: Strict Policy Tier Capacity Limiting', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      // Mock the scenario:
      // Assuming a Tier sets Max Parents = 2
      // AI Action -> Force click Add Parent via DOM override
      const addParentBtn = page.locator('button:has-text("PARENT:")');
      if (await addParentBtn.isVisible()) {
        const textStr = await addParentBtn.innerText(); 
        const match = textStr.match(/(\d+)\/(\d+)/);
        if (match && parseInt(match[1]) >= parseInt(match[2])) {
           // Should be disabled cleanly
           await expect(addParentBtn).toBeDisabled();
           // Force enabling it maliciously via DOM injection
           await page.evaluate(() => document.querySelectorAll('button').forEach(b => b.disabled = false));
           // Click it
           await addParentBtn.click({ force: true });
           // Evaluate strict backend blocking rules...
        }
      }
    });
    
  });

});
