import { createHash, randomUUID } from "node:crypto";
import { argon2id, hash } from "argon2";
import { createPrismaClient } from "./client.js";

const db = createPrismaClient();

const email = "owner@demo.local";
const password = "Demo@123456";
const organizationSlug = "demo-home-land";

async function passwordHash(value: string): Promise<string> {
  return hash(value, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

function hashBytes(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(createHash("sha256").update(value).digest());
}

async function main() {
  const existing = await db.organization.findUnique({ where: { slug: organizationSlug } });

  if (existing) {
    console.log("Demo seed already exists.");
    console.log(`Login: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Organization: ${existing.id}`);
    return;
  }

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const leaseStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const leaseEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), 0));

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        fullName: "Demo Owner",
        status: "ACTIVE",
        emailVerifiedAt: now,
      },
      select: { id: true },
    });

    await tx.passwordCredential.create({
      data: {
        userId: user.id,
        passwordHash: await passwordHash(password),
      },
    });

    const organization = await tx.organization.create({
      data: {
        legalName: "Demo Home Land LLC",
        displayName: "Demo Home Land",
        slug: organizationSlug,
        organizationType: "PROPERTY_MANAGEMENT_COMPANY",
        approximateUnitRange: "TEN_TO_NINETY_NINE",
        primaryStateCode: "TX",
        timeZone: "America/Chicago",
        locale: "en-US",
        status: "ACTIVE",
        createdById: user.id,
      },
      select: { id: true },
    });

    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "OWNER",
        status: "ACTIVE",
        acceptedAt: now,
      },
    });

    await tx.onboardingProgress.create({
      data: {
        organizationId: organization.id,
        state: "ACTIVE",
        activatedAt: now,
      },
    });

    const property = await tx.property.create({
      data: {
        organizationId: organization.id,
        name: "Demo Lakeview Apartments",
        propertyType: "APARTMENT_COMPLEX",
        addressLine1: "100 Demo Street",
        city: "Austin",
        stateCode: "TX",
        postalCode: "73301",
        countryCode: "US",
        timeZone: "America/Chicago",
        normalizedAddressHash: hashBytes("100 demo street austin tx 73301"),
        status: "ACTIVE",
      },
      select: { id: true },
    });

    const unit = await tx.unit.create({
      data: {
        organizationId: organization.id,
        propertyId: property.id,
        unitCode: "A-101",
        status: "OCCUPIED",
        bedrooms: 2,
        bathrooms: "1.5",
      },
      select: { id: true },
    });

    const tenant = await tx.tenantProfile.create({
      data: {
        organizationId: organization.id,
        firstName: "John",
        lastName: "Tenant",
        email: "tenant@demo.local",
        phone: "+15551234567",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    const lease = await tx.lease.create({
      data: {
        organizationId: organization.id,
        propertyId: property.id,
        unitId: unit.id,
        tenantProfileId: tenant.id,
        status: "ACTIVE",
        startDate: leaseStart,
        endDate: leaseEnd,
        monthlyRentMinor: 125000,
        securityDepositMinor: 125000,
        rentDueDay: 1,
      },
      select: { id: true },
    });

    const obligation = await tx.rentObligation.create({
      data: {
        organizationId: organization.id,
        leaseId: lease.id,
        periodStart,
        periodEnd,
        dueDate,
        amountMinor: 125000,
        status: "PARTIALLY_PAID",
      },
      select: { id: true },
    });

    const obligationLedger = await tx.ledgerTransaction.create({
      data: {
        organizationId: organization.id,
        rentObligationId: obligation.id,
        description: "Demo rent obligation",
        correlationId: randomUUID(),
      },
      select: { id: true },
    });

    await tx.ledgerEntry.createMany({
      data: [
        {
          organizationId: organization.id,
          transactionId: obligationLedger.id,
          accountCode: "RENT_RECEIVABLE",
          direction: "DEBIT",
          amountMinor: 125000,
        },
        {
          organizationId: organization.id,
          transactionId: obligationLedger.id,
          accountCode: "RENT_REVENUE",
          direction: "CREDIT",
          amountMinor: 125000,
        },
      ],
    });

    const payment = await tx.payment.create({
      data: {
        organizationId: organization.id,
        tenantProfileId: tenant.id,
        amountMinor: 75000,
        method: "CASH",
        receivedAt: now,
        externalReference: "DEMO-CASH-001",
      },
      select: { id: true },
    });

    await tx.paymentAllocation.create({
      data: {
        organizationId: organization.id,
        paymentId: payment.id,
        rentObligationId: obligation.id,
        amountMinor: 75000,
      },
    });

    const paymentLedger = await tx.ledgerTransaction.create({
      data: {
        organizationId: organization.id,
        paymentId: payment.id,
        description: "Demo payment",
        correlationId: randomUUID(),
      },
      select: { id: true },
    });

    await tx.ledgerEntry.createMany({
      data: [
        {
          organizationId: organization.id,
          transactionId: paymentLedger.id,
          accountCode: "CASH",
          direction: "DEBIT",
          amountMinor: 75000,
        },
        {
          organizationId: organization.id,
          transactionId: paymentLedger.id,
          accountCode: "RENT_RECEIVABLE",
          direction: "CREDIT",
          amountMinor: 75000,
        },
      ],
    });

    await tx.receipt.create({
      data: {
        organizationId: organization.id,
        paymentId: payment.id,
        receiptNumber: "RCP-DEMO-001",
      },
    });

    await tx.reconciliationItem.create({
      data: {
        organizationId: organization.id,
        kind: "PAYMENT_REVIEW",
        paymentId: payment.id,
      },
    });

    console.log("Demo seed created.");
    console.log(`Login: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Organization: ${organization.id}`);

    await tx.termsAcceptance.create({
      data: {
        userId: user.id,
        termsVersion: "demo-v1",
        acceptedAt: now,
      },
    });
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
