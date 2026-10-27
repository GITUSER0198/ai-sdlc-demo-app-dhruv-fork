import { expect, test } from '@playwright/test';
import { ApprovalsPage } from '../pages/ApprovalsPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { LoginPage } from '../pages/LoginPage';

test('manager sees over-limit reason and invoice remains pending', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const invoicesPage = new InvoicesPage(page);
  const approvalsPage = new ApprovalsPage(page);
  const customerName = 'Northwind Studio';
  const amount = '75000';

  await loginPage.open();
  await loginPage.signIn('demo.manager', 'ChangeMe123!');

  await invoicesPage.createInvoice(customerName, amount);
  await invoicesPage.submitForApproval(customerName);

  await approvalsPage.open();
  await approvalsPage.approve(customerName);

  await expect(approvalsPage.getDecisionError()).toHaveText(
    /Manager approval limit is 50,000\. Amount 75,000\.00 exceeds the limit\./
  );

  await expect(approvalsPage.getPendingInvoice(customerName)).toContainText(customerName);
  await expect(approvalsPage.getPendingInvoice(customerName).getByRole('button', { name: /Approve invoice/i })).toBeVisible();
});
