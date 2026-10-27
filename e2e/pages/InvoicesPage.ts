import type { Page } from '@playwright/test';

export class InvoicesPage {
  constructor(private readonly page: Page) {}

  async createInvoice(customerName: string, amount: string) {
    await this.page.getByLabel('Customer name').fill(customerName);
    await this.page.getByLabel('Amount').fill(amount);
    await this.page.getByRole('button', { name: 'Create invoice' }).click();
  }

  getRowByCustomer(customerName: string) {
    return this.page.getByRole('row').filter({ hasText: customerName });
  }

  async submitForApproval(customerName: string) {
    const row = this.getRowByCustomer(customerName);
    await row.getByRole('button', { name: /Submit invoice .* for approval/i }).click();
  }
}
