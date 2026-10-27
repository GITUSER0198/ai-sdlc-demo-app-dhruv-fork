import type { Page } from '@playwright/test';

export class ApprovalsPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.getByRole('tab', { name: 'Approvals' }).click();
  }

  getDecisionError() {
    return this.page.getByRole('alert');
  }

  getPendingInvoice(customerName: string) {
    return this.page.getByRole('listitem').filter({ hasText: customerName });
  }

  async approve(customerName: string) {
    const item = this.getPendingInvoice(customerName);
    await item.getByRole('button', { name: /Approve invoice .*?/i }).click();
  }
}
