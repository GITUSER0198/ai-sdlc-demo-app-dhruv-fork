using System.Globalization;

namespace InvoiceApp.Domain;

/// <summary>
/// Moves an invoice through its lifecycle: Draft -> PendingApproval -> Approved or Rejected.
/// One invoice at a time, decided as a whole by a single approver.
/// </summary>
public class ApprovalService
{
    public const decimal ManagerApprovalLimit = 50_000m;
    public const decimal DirectorApprovalLimit = 500_000m;

    private readonly IInvoiceRepository _repository;

    public ApprovalService(IInvoiceRepository repository)
    {
        _repository = repository;
    }

    public Invoice Submit(string invoiceId)
    {
        var invoice = Find(invoiceId);

        if (invoice.Status != InvoiceStatus.Draft)
        {
            throw new InvalidOperationException(
                $"Invoice {invoiceId} is {invoice.Status}; only drafts can be submitted.");
        }

        invoice.Status = InvoiceStatus.PendingApproval;
        _repository.Update(invoice);
        return invoice;
    }

    public Invoice Approve(string invoiceId, string approver, string role)
    {
        var invoice = Find(invoiceId);
        EnsurePending(invoice);

        var normalizedApprover = NormalizeApproverName(approver);

        if (invoice.Amount > DirectorApprovalLimit)
        {
            if (string.IsNullOrWhiteSpace(invoice.FirstApprover))
            {
                EnsureApprovalRoleCanApprove(role);

                invoice.FirstApprover = normalizedApprover;
                invoice.FirstApprovedAt = DateTime.UtcNow;
                _repository.Update(invoice);
                return invoice;
            }

            if (IsSameApprover(invoice.FirstApprover, normalizedApprover))
            {
                throw new InvalidOperationException(
                    $"Second approval above 500,000 requires a different approver than the first. Approver '{normalizedApprover}' cannot approve the same invoice twice.");
            }

            if (!string.Equals(role, "Director", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Second approval above 500,000 requires a Director.");
            }

            invoice.Status = InvoiceStatus.Approved;
            invoice.DecidedBy = normalizedApprover;
            invoice.DecidedAt = DateTime.UtcNow;
            _repository.Update(invoice);
            return invoice;
        }

        EnsureApprovalRoleAndLimit(role, invoice.Amount);

        invoice.Status = InvoiceStatus.Approved;
        invoice.DecidedBy = normalizedApprover;
        invoice.DecidedAt = DateTime.UtcNow;
        _repository.Update(invoice);
        return invoice;
    }

    public Invoice Reject(string invoiceId, string approver, string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("A reason is required to reject an invoice.", nameof(reason));
        }

        var invoice = Find(invoiceId);
        EnsurePending(invoice);

        invoice.Status = InvoiceStatus.Rejected;
        invoice.DecidedBy = approver;
        invoice.DecidedAt = DateTime.UtcNow;
        invoice.DecisionNote = reason;
        _repository.Update(invoice);
        return invoice;
    }

    private Invoice Find(string invoiceId) =>
        _repository.GetById(invoiceId)
        ?? throw new KeyNotFoundException($"Invoice {invoiceId} was not found.");

    private static void EnsurePending(Invoice invoice)
    {
        if (invoice.Status != InvoiceStatus.PendingApproval)
        {
            throw new InvalidOperationException(
                $"Invoice {invoice.Id} is {invoice.Status}; only pending invoices can be decided.");
        }
    }

    private static void EnsureApprovalRoleAndLimit(string role, decimal amount)
    {
        if (string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase))
        {
            if (amount > ManagerApprovalLimit)
            {
                var managerLimitText = ManagerApprovalLimit.ToString("0,0", CultureInfo.InvariantCulture);
                var amountText = amount.ToString("0,0.00", CultureInfo.InvariantCulture);
                throw new InvalidOperationException(
                    $"Manager approval limit is {managerLimitText}. Amount {amountText} exceeds the limit.");
            }

            return;
        }

        if (string.Equals(role, "Director", StringComparison.OrdinalIgnoreCase))
        {
            if (amount > DirectorApprovalLimit)
            {
                var directorLimitText = DirectorApprovalLimit.ToString("0,0", CultureInfo.InvariantCulture);
                var amountText = amount.ToString("0,0.00", CultureInfo.InvariantCulture);
                throw new InvalidOperationException(
                    $"Director approval limit is {directorLimitText}. Amount {amountText} exceeds the single-approver limit.");
            }

            return;
        }

        throw new InvalidOperationException($"Role '{role}' cannot approve invoices.");
    }

    private static void EnsureApprovalRoleCanApprove(string role)
    {
        if (!string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(role, "Director", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Role '{role}' cannot approve invoices.");
        }
    }

    private static string NormalizeApproverName(string approver) => approver.Trim();

    private static bool IsSameApprover(string? firstApprover, string? approver) =>
        !string.IsNullOrWhiteSpace(firstApprover)
        && !string.IsNullOrWhiteSpace(approver)
        && string.Equals(firstApprover.Trim(), approver.Trim(), StringComparison.OrdinalIgnoreCase);
}
