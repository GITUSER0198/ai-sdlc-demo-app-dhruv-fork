using InvoiceApp.Domain;
using Xunit;

namespace InvoiceApp.Tests;

public class ApprovalServiceTests
{
    private static Invoice InvoiceWith(string id, InvoiceStatus status, decimal amount = 100m) =>
        new() { Id = id, CustomerName = "Test School", Amount = amount, Status = status };

    private static ApprovalService ServiceFor(params Invoice[] invoices) =>
        new(new FakeInvoiceRepository(invoices));

    private static void AssertInvoiceUnchanged(Invoice invoice)
    {
        Assert.Equal(InvoiceStatus.PendingApproval, invoice.Status);
        Assert.Null(invoice.DecidedBy);
        Assert.Null(invoice.DecidedAt);
        Assert.Null(invoice.DecisionNote);
    }

    [Fact]
    public void Submit_MovesDraftToPendingApproval()
    {
        var invoice = InvoiceWith("INV-1", InvoiceStatus.Draft);

        var result = ServiceFor(invoice).Submit("INV-1");

        Assert.Equal(InvoiceStatus.PendingApproval, result.Status);
    }

    [Fact]
    public void Submit_RejectsInvoiceThatIsNotADraft()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.Approved));

        Assert.Throws<InvalidOperationException>(() => service.Submit("INV-1"));
    }

    [Fact]
    public void Approve_SetsStatusApproverAndTimestamp()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.PendingApproval));

        var result = service.Approve("INV-1", "demo.manager", "Manager");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
        Assert.Equal("demo.manager", result.DecidedBy);
        Assert.NotNull(result.DecidedAt);
    }

    [Fact]
    public void Approve_Manager_ApprovesAtTheFiftyThousandBoundary()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.PendingApproval, 50000m));

        var result = service.Approve("INV-1", "demo.manager", "Manager");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
    }

    [Fact]
    public void Approve_Manager_RefusesAmountAboveTheLimit_AndLeavesInvoiceUnchanged()
    {
        var invoice = InvoiceWith("INV-1", InvoiceStatus.PendingApproval, 50000.01m);
        var service = ServiceFor(invoice);

        var ex = Assert.Throws<InvalidOperationException>(() => service.Approve("INV-1", "demo.manager", "Manager"));

        Assert.Contains("Manager", ex.Message);
        Assert.Contains("50,000", ex.Message);
        AssertInvoiceUnchanged(invoice);
    }

    [Fact]
    public void Approve_Director_ApprovesAtTheFiveHundredThousandBoundary()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.PendingApproval, 500000m));

        var result = service.Approve("INV-1", "demo.director", "Director");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
    }

    [Fact]
    public void Approve_Director_RefusesAboveFiveHundredThousandForNow_AndLeavesInvoiceUnchanged()
    {
        var invoice = InvoiceWith("INV-1", InvoiceStatus.PendingApproval, 500000.01m);
        var service = ServiceFor(invoice);

        var ex = Assert.Throws<InvalidOperationException>(() => service.Approve("INV-1", "demo.director", "Director"));

        Assert.Contains("500,000", ex.Message);
        AssertInvoiceUnchanged(invoice);
    }

    [Theory]
    [InlineData("Approver")]
    [InlineData("Admin")]
    public void Approve_RejectsRolesWithoutApprovalLimits_AndLeavesInvoiceUnchanged(string role)
    {
        var invoice = InvoiceWith("INV-1", InvoiceStatus.PendingApproval, 100m);
        var service = ServiceFor(invoice);

        var ex = Assert.Throws<InvalidOperationException>(() => service.Approve("INV-1", "demo.approver", role));

        Assert.Contains(role, ex.Message);
        AssertInvoiceUnchanged(invoice);
    }

    [Fact]
    public void Approve_RejectsInvoiceThatIsStillADraft()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.Draft));

        Assert.Throws<InvalidOperationException>(() => service.Approve("INV-1", "demo.manager", "Manager"));
    }

    [Fact]
    public void Approve_ThrowsWhenInvoiceDoesNotExist()
    {
        var service = ServiceFor();

        Assert.Throws<KeyNotFoundException>(() => service.Approve("INV-404", "demo.manager", "Manager"));
    }

    [Fact]
    public void Reject_RecordsReasonAndApprover()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.PendingApproval));

        var result = service.Reject("INV-1", "demo.approver", "Duplicate invoice");

        Assert.Equal(InvoiceStatus.Rejected, result.Status);
        Assert.Equal("Duplicate invoice", result.DecisionNote);
    }

    [Fact]
    public void Reject_RequiresAReason()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.PendingApproval));

        Assert.Throws<ArgumentException>(() => service.Reject("INV-1", "demo.approver", "  "));
    }
}
