"use client";

import { useState } from "react";
import type { MessageKey } from "@lcsp/i18n";
import {
  BILLING_ADMIN_PERIODS,
  BILLING_ADMIN_PAYMENT_FILTERS,
} from "@lcsp/contracts/billing";
import type {
  BillingAdminPeriod,
  BillingAdminPaymentFilter,
} from "@lcsp/contracts/billing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AdminOverviewMetricCard } from "../atoms/admin-overview-metric-card";
import { AdminPageHeader } from "../molecules/admin-page-header";
import { AdminPagination } from "../molecules/admin-pagination";
import {
  BILLING_ADMIN_FILTER_OPTIONS,
  BILLING_ADMIN_PAGE_SIZE,
  BILLING_ADMIN_PERIOD_OPTIONS,
  BILLING_ADMIN_STATUS_LABEL_KEYS,
} from "../../config/billing-admin.config";
import { useAdminBillingQuery } from "@/lib/api/admin-billing-queries";
import { resolveAppMessage } from "@/lib/i18n";

export function AdminBillingPage() {
  const [period, setPeriod] = useState<BillingAdminPeriod>(
    BILLING_ADMIN_PERIODS.d30,
  );
  const [status, setStatus] = useState<BillingAdminPaymentFilter>(
    BILLING_ADMIN_PAYMENT_FILTERS.all,
  );
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAdminBillingQuery({
    period,
    status,
    page,
    pageSize: BILLING_ADMIN_PAGE_SIZE,
  });
  const dashboard = isError ? undefined : data;
  const selectedPeriodLabel = BILLING_ADMIN_PERIOD_OPTIONS.find(
    (option) => option.value === period,
  )?.labelKey;

  const message = (key: string) => resolveAppMessage(key as MessageKey);
  const formatVnd = (amount: string | undefined) =>
    amount === undefined
      ? "—"
      : `${new Intl.NumberFormat(undefined).format(BigInt(amount))} ₫`;

  return (
    <div
      className="space-y-6"
      data-testid="admin-billing-page"
      data-figma-node="1320:2"
    >
      <AdminPageHeader
        title={message("pages.admin.billing.title")}
        description={message("pages.admin.billing.description")}
        actionSlot={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{message("pages.admin.overview.periodLabel")}</span>
            <select
              aria-label={message("pages.admin.billing.periodAria")}
              className="h-9 rounded-md border border-input bg-background px-3 text-foreground"
              value={period}
              onChange={(event) => {
                setPeriod(event.currentTarget.value as BillingAdminPeriod);
                setPage(1);
              }}
            >
              {BILLING_ADMIN_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {message(option.labelKey)}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {isError ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{message("pages.admin.billing.errorTitle")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{message("pages.admin.billing.errorDescription")}</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {message("pages.admin.billing.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-label={message("pages.admin.billing.title")}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <AdminOverviewMetricCard
          label={message("pages.admin.billing.metrics.settledTopUps")}
          value={
            dashboard ? formatVnd(dashboard.summary.settledTopUpVnd) : undefined
          }
          subtitle={message(
            selectedPeriodLabel ?? "pages.admin.billing.periods.d30",
          )}
          isLoading={isLoading}
        />
        <AdminOverviewMetricCard
          label={message("pages.admin.billing.metrics.usageRevenue")}
          value={
            dashboard ? formatVnd(dashboard.summary.usageRevenueVnd) : undefined
          }
          subtitle={message(
            selectedPeriodLabel ?? "pages.admin.billing.periods.d30",
          )}
          isLoading={isLoading}
        />
        <AdminOverviewMetricCard
          label={message("pages.admin.billing.metrics.pendingReconciliation")}
          value={dashboard?.summary.pendingReconciliationCount}
          subtitle={message("pages.admin.billing.status.needsReview")}
          isLoading={isLoading}
        />
        <AdminOverviewMetricCard
          label={message("pages.admin.billing.metrics.duplicates")}
          value={dashboard?.summary.duplicatePaymentCount}
          subtitle={message("pages.admin.billing.status.duplicate")}
          isLoading={isLoading}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {message("pages.admin.billing.columns.payment")}
          </h2>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{message("pages.admin.billing.columns.status")}</span>
            <select
              aria-label={message("pages.admin.billing.statusAria")}
              className="h-9 rounded-md border border-input bg-background px-3 text-foreground"
              value={status}
              onChange={(event) => {
                setStatus(
                  event.currentTarget.value as BillingAdminPaymentFilter,
                );
                setPage(1);
              }}
            >
              {BILLING_ADMIN_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {message(option.labelKey)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!isError && !isLoading && dashboard?.items.length === 0 ? (
          <div className="p-10 text-center" data-testid="admin-billing-empty">
            <h3 className="font-medium text-foreground">
              {message("pages.admin.billing.emptyTitle")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {message("pages.admin.billing.emptyDescription")}
            </p>
          </div>
        ) : null}

        {dashboard && dashboard.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table
              aria-label={message("pages.admin.billing.tableAria")}
              className="w-full min-w-190 text-left text-sm"
            >
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    {message("pages.admin.billing.columns.payment")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {message("pages.admin.billing.columns.customer")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {message("pages.admin.billing.columns.amount")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {message("pages.admin.billing.columns.status")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {message("pages.admin.billing.columns.received")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dashboard.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {item.providerTransactionId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.order?.paymentCode ?? item.provider}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.account ? (
                        <>
                          <div className="font-medium text-foreground">
                            {item.account.displayName ?? item.account.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.account.email}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          {message("pages.admin.billing.unknownAccount")}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      {formatVnd(item.amountVnd)}
                    </td>
                    <td className="px-4 py-3">
                      {message(
                        BILLING_ADMIN_STATUS_LABEL_KEYS[
                          item.reconciliationStatus
                        ],
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {new Date(item.receivedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {isLoading ? (
          <div
            className="p-10 text-center text-sm text-muted-foreground"
            role="status"
          >
            {message("pages.admin.billing.loading")}
          </div>
        ) : null}

        {dashboard ? (
          <div className="border-t border-border px-4 pb-4">
            <AdminPagination
              page={dashboard.page}
              totalPages={Math.max(
                1,
                Math.ceil(dashboard.totalCount / dashboard.pageSize),
              )}
              disabled={isLoading}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
