"use client";

import {
  BILLING_ESTIMATE_AVAILABILITY,
  BILLING_ORDER_STATUSES,
  type BillingOrderStatus,
  type BillingOrderView,
} from "@lcsp/contracts/billing";
import type { Locale } from "@lcsp/contracts/shared";
import type { MessageKey } from "@lcsp/i18n";
import { resolveMessage } from "@lcsp/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  Clock3Icon,
  CopyIcon,
  QrCodeIcon,
  RefreshCwIcon,
  WalletCardsIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useBillingEstimateQuery,
  useBillingHistoryQuery,
  useBillingOrderQuery,
  useBillingWalletQuery,
  useCreateBillingOrderMutation,
} from "@/lib/api/billing-queries";
import { apiQueryKeys } from "@/lib/api/query-keys";

import {
  billingTopUpSchema,
  type BillingTopUpFormValues,
} from "../../schemas/billing-top-up.schema";

const orderStatusKeys = {
  [BILLING_ORDER_STATUSES.PENDING_PAYMENT]:
    "pages.workspace.settingsHub.billing.statuses.pendingPayment",
  [BILLING_ORDER_STATUSES.CREDITED]:
    "pages.workspace.settingsHub.billing.statuses.credited",
  [BILLING_ORDER_STATUSES.EXPIRED]:
    "pages.workspace.settingsHub.billing.statuses.expired",
  [BILLING_ORDER_STATUSES.CANCELLED]:
    "pages.workspace.settingsHub.billing.statuses.cancelled",
  [BILLING_ORDER_STATUSES.PENDING_RECONCILIATION]:
    "pages.workspace.settingsHub.billing.statuses.pendingReconciliation",
} satisfies Record<BillingOrderStatus, MessageKey>;

export function BillingSettingsPanel({ locale }: { locale: Locale }) {
  const walletQuery = useBillingWalletQuery();
  const historyQuery = useBillingHistoryQuery();
  const createOrderMutation = useCreateBillingOrderMutation();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [copiedPaymentCode, setCopiedPaymentCode] = useState(false);
  const retryKey = useRef<string | null>(null);
  const form = useForm<BillingTopUpFormValues>({
    resolver: zodResolver(billingTopUpSchema),
    defaultValues: { amountVnd: "" },
  });
  const amountVnd = form.watch("amountVnd");
  const validAmountVnd = useMemo(
    () =>
      billingTopUpSchema.safeParse({ amountVnd }).success ? amountVnd : "",
    [amountVnd],
  );
  const estimateQuery = useBillingEstimateQuery(validAmountVnd);
  const pendingHistoryOrder = historyQuery.data?.orders.find(
    (order) =>
      order.status === BILLING_ORDER_STATUSES.PENDING_PAYMENT ||
      order.status === BILLING_ORDER_STATUSES.PENDING_RECONCILIATION,
  );
  const activeOrderId = selectedOrderId ?? pendingHistoryOrder?.id ?? null;
  const orderQuery = useBillingOrderQuery(activeOrderId);
  const displayedOrder =
    orderQuery.data ??
    (selectedOrderId
      ? historyQuery.data?.orders.find((order) => order.id === selectedOrderId)
      : pendingHistoryOrder);
  const lastSettledOrder = useRef<string | null>(null);

  useEffect(() => {
    const order = orderQuery.data;
    if (!order) return;
    const terminal =
      order.status === BILLING_ORDER_STATUSES.CREDITED ||
      order.status === BILLING_ORDER_STATUSES.EXPIRED ||
      order.status === BILLING_ORDER_STATUSES.CANCELLED;
    const settlementKey = `${order.id}:${order.status}`;
    if (!terminal || lastSettledOrder.current === settlementKey) return;
    lastSettledOrder.current = settlementKey;
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.billing.wallet(),
      }),
      queryClient.invalidateQueries({ queryKey: ["billing", "history"] }),
    ]);
  }, [
    orderQuery.data,
    orderQuery.data?.id,
    orderQuery.data?.status,
    queryClient,
  ]);

  async function handleSubmit(values: BillingTopUpFormValues) {
    const idempotencyKey = retryKey.current ?? crypto.randomUUID();
    retryKey.current = idempotencyKey;
    try {
      const order = await createOrderMutation.mutateAsync({
        amountVnd: values.amountVnd,
        idempotencyKey,
      });
      retryKey.current = null;
      setSelectedOrderId(order.id);
      setCopiedPaymentCode(false);
      form.reset(values);
    } catch {
      // Keep the idempotency key so a retry replays the same server operation.
    }
  }

  async function copyPaymentCode(paymentCode: string) {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(paymentCode);
    setCopiedPaymentCode(true);
  }

  const hasLoadError = walletQuery.isError || historyQuery.isError;
  if (walletQuery.isLoading || historyQuery.isLoading) {
    return (
      <PanelShell locale={locale}>
        <p role="status" className="text-sm text-muted-foreground">
          {resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.loading",
          )}
        </p>
      </PanelShell>
    );
  }

  if (hasLoadError || !walletQuery.data || !historyQuery.data) {
    return (
      <PanelShell locale={locale}>
        <Alert variant="destructive">
          <AlertTitle>
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.errorTitle",
            )}
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.errorDescription",
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void walletQuery.refetch();
                void historyQuery.refetch();
              }}
            >
              <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
              {resolveMessage(
                locale,
                "pages.workspace.settingsHub.billing.retry",
              )}
            </Button>
          </AlertDescription>
        </Alert>
      </PanelShell>
    );
  }

  return (
    <PanelShell locale={locale}>
      <header>
        <h2 className="text-lg font-medium">
          {resolveMessage(locale, "pages.workspace.settingsHub.billing.title")}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.description",
          )}
        </p>
      </header>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section
          aria-labelledby="billing-balance-heading"
          className="rounded-xl border border-border/70 bg-muted/20 p-5"
        >
          <div className="flex items-center gap-2">
            <WalletCardsIcon aria-hidden="true" className="size-4" />
            <h3 id="billing-balance-heading" className="text-sm font-medium">
              {resolveMessage(
                locale,
                "pages.workspace.settingsHub.billing.balanceTitle",
              )}
            </h3>
          </div>
          <p className="mt-4 text-2xl font-semibold tabular-nums">
            {formatVnd(walletQuery.data.availableCredits, locale)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.availableBalance",
            )}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.reservedBalance",
            )}
            :{" "}
            <span className="font-medium text-foreground">
              {formatVnd(walletQuery.data.reservedCredits, locale)}
            </span>
          </p>
        </section>

        <section
          aria-labelledby="billing-top-up-heading"
          className="rounded-xl border border-border/70 bg-muted/20 p-5"
        >
          <h3 id="billing-top-up-heading" className="text-sm font-medium">
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.topUpTitle",
            )}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.topUpDescription",
            )}
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <label htmlFor="billing-amount-vnd" className="text-sm">
                {resolveMessage(
                  locale,
                  "pages.workspace.settingsHub.billing.amountLabel",
                )}
              </label>
              <Input
                id="billing-amount-vnd"
                inputMode="numeric"
                aria-invalid={
                  form.formState.errors.amountVnd ? "true" : undefined
                }
                placeholder={resolveMessage(
                  locale,
                  "pages.workspace.settingsHub.billing.amountPlaceholder",
                )}
                {...form.register("amountVnd")}
              />
              {form.formState.errors.amountVnd ? (
                <p role="alert" className="text-xs text-destructive">
                  {resolveMessage(
                    locale,
                    "pages.workspace.settingsHub.billing.amountInvalid",
                  )}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {resolveMessage(
                  locale,
                  "pages.workspace.settingsHub.billing.amountHint",
                )}
              </p>
            </div>
            <Button type="submit" disabled={createOrderMutation.isPending}>
              {createOrderMutation.isPending
                ? resolveMessage(
                    locale,
                    "pages.workspace.settingsHub.billing.creatingOrder",
                  )
                : resolveMessage(
                    locale,
                    "pages.workspace.settingsHub.billing.createOrder",
                  )}
            </Button>
            {createOrderMutation.isError ? (
              <p role="alert" className="text-xs text-destructive">
                {resolveMessage(
                  locale,
                  "pages.workspace.settingsHub.billing.createOrderError",
                )}
              </p>
            ) : null}
          </form>
        </section>
      </div>

      <EstimateSection locale={locale} query={estimateQuery} />

      {displayedOrder ? (
        <PaymentOrderSection
          locale={locale}
          order={displayedOrder}
          copied={copiedPaymentCode}
          onCopy={() => void copyPaymentCode(displayedOrder.paymentCode)}
        />
      ) : (
        <section className="mt-4 rounded-xl border border-dashed border-border/70 p-5">
          <h3 className="text-sm font-medium">
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.activeOrderTitle",
            )}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.noActiveOrder",
            )}
          </p>
        </section>
      )}

      <HistorySection locale={locale} orders={historyQuery.data.orders} />
    </PanelShell>
  );
}

function PanelShell({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  return (
    <section
      aria-label={resolveMessage(
        locale,
        "pages.workspace.settingsHub.billing.title",
      )}
      className="h-full min-h-0 overflow-y-auto px-6 py-8 text-foreground md:px-8.5 md:py-10"
      data-component="BillingSettingsPanel"
    >
      {children}
    </section>
  );
}

function EstimateSection({
  locale,
  query,
}: {
  locale: Locale;
  query: ReturnType<typeof useBillingEstimateQuery>;
}) {
  return (
    <section
      aria-labelledby="billing-estimate-heading"
      className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-5"
    >
      <h3 id="billing-estimate-heading" className="text-sm font-medium">
        {resolveMessage(
          locale,
          "pages.workspace.settingsHub.billing.estimateTitle",
        )}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {resolveMessage(
          locale,
          "pages.workspace.settingsHub.billing.estimateDescription",
        )}
      </p>
      {!query.data && !query.isFetching ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.estimatePrompt",
          )}
        </p>
      ) : null}
      {query.isFetching ? (
        <p role="status" className="mt-3 text-xs text-muted-foreground">
          {resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.estimateLoading",
          )}
        </p>
      ) : null}
      {query.isError ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.estimateError",
          )}
        </p>
      ) : null}
      {query.data ? (
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <Metric
            label={resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.effectiveProvider",
            )}
            value={
              query.data.effectiveRuntimeModel?.provider ??
              resolveMessage(
                locale,
                "pages.workspace.settingsHub.billing.unavailable",
              )
            }
          />
          <Metric
            label={resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.effectiveModel",
            )}
            value={
              query.data.effectiveRuntimeModel?.model ??
              resolveMessage(
                locale,
                "pages.workspace.settingsHub.billing.unavailable",
              )
            }
          />
          <Metric
            label={resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.estimatedUsageCharge",
            )}
            value={
              query.data.estimatedUsageChargeVnd
                ? formatVnd(query.data.estimatedUsageChargeVnd, locale)
                : resolveMessage(
                    locale,
                    "pages.workspace.settingsHub.billing.unavailable",
                  )
            }
          />
        </div>
      ) : null}
      {query.data?.availability ===
      BILLING_ESTIMATE_AVAILABILITY.insufficientPricingConfiguration ? (
        <Alert className="mt-4">
          <AlertTitle>
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.insufficientPricingTitle",
            )}
          </AlertTitle>
          <AlertDescription>
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.insufficientPricingDescription",
            )}
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

function PaymentOrderSection({
  locale,
  order,
  copied,
  onCopy,
}: {
  locale: Locale;
  order: BillingOrderView;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section
      aria-labelledby="billing-order-heading"
      className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="billing-order-heading" className="text-sm font-medium">
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.paymentTitle",
            )}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.paymentDescription",
            )}
          </p>
        </div>
        <Badge variant={statusVariant(order.status)}>
          {resolveMessage(locale, orderStatusKeys[order.status])}
        </Badge>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <Metric
            label={resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.orderAmount",
            )}
            value={formatVnd(order.amountVnd, locale)}
          />
          <Metric
            label={resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.orderCredits",
            )}
            value={formatCredits(order.creditUnits, locale)}
          />
          <Metric
            label={resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.expiresAt",
            )}
            value={
              order.expiresAt
                ? formatDate(order.expiresAt, locale)
                : resolveMessage(
                    locale,
                    "pages.workspace.settingsHub.billing.unavailable",
                  )
            }
          />
          <Metric
            label={resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.createdAt",
            )}
            value={formatDate(order.createdAt, locale)}
          />
        </div>
        <div className="flex items-center justify-center rounded-lg border border-border/70 bg-background p-3">
          {order.paymentInstructions.qrCodeUrl ? (
            <img
              src={order.paymentInstructions.qrCodeUrl}
              alt={resolveMessage(
                locale,
                "pages.workspace.settingsHub.billing.qrAlt",
              )}
              className="size-40 rounded-md bg-white p-2"
            />
          ) : (
            <QrCodeIcon
              aria-hidden="true"
              className="size-16 text-muted-foreground"
            />
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Instruction
          label={resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.bankName",
          )}
          value={order.paymentInstructions.bankName}
        />
        <Instruction
          label={resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.accountNumber",
          )}
          value={order.paymentInstructions.bankAccountNumber}
        />
        <Instruction
          label={resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.accountHolder",
          )}
          value={order.paymentInstructions.accountHolder}
        />
        <Instruction
          label={resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.transferContent",
          )}
          value={order.paymentInstructions.transferContent}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-background p-3">
        <span className="text-xs text-muted-foreground">
          {resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.paymentCode",
          )}
        </span>
        <code className="font-mono text-sm">{order.paymentCode}</code>
        <Button type="button" size="sm" variant="ghost" onClick={onCopy}>
          {copied ? (
            <CheckIcon aria-hidden="true" data-icon="inline-start" />
          ) : (
            <CopyIcon aria-hidden="true" data-icon="inline-start" />
          )}
          {resolveMessage(
            locale,
            copied
              ? "pages.workspace.settingsHub.billing.copied"
              : "pages.workspace.settingsHub.billing.copyPaymentCode",
          )}
        </Button>
      </div>
      {order.status === BILLING_ORDER_STATUSES.PENDING_PAYMENT ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3Icon aria-hidden="true" className="size-3.5" />
          {resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.pendingPaymentHint",
          )}
        </p>
      ) : null}
      {order.status === BILLING_ORDER_STATUSES.PENDING_RECONCILIATION ? (
        <Alert className="mt-4">
          <AlertTitle>
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.pendingReconciliationTitle",
            )}
          </AlertTitle>
          <AlertDescription>
            {resolveMessage(
              locale,
              "pages.workspace.settingsHub.billing.pendingReconciliationDescription",
            )}
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

function HistorySection({
  locale,
  orders,
}: {
  locale: Locale;
  orders: BillingOrderView[];
}) {
  return (
    <section aria-labelledby="billing-history-heading" className="mt-4">
      <h3 id="billing-history-heading" className="text-sm font-medium">
        {resolveMessage(
          locale,
          "pages.workspace.settingsHub.billing.historyTitle",
        )}
      </h3>
      {orders.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border/70 p-5 text-xs text-muted-foreground">
          {resolveMessage(
            locale,
            "pages.workspace.settingsHub.billing.historyEmpty",
          )}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-145 text-left text-xs">
            <caption className="sr-only">
              {resolveMessage(
                locale,
                "pages.workspace.settingsHub.billing.historyTitle",
              )}
            </caption>
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {resolveMessage(
                    locale,
                    "pages.workspace.settingsHub.billing.createdAt",
                  )}
                </th>
                <th className="px-4 py-3 font-medium">
                  {resolveMessage(
                    locale,
                    "pages.workspace.settingsHub.billing.orderAmount",
                  )}
                </th>
                <th className="px-4 py-3 font-medium">
                  {resolveMessage(
                    locale,
                    "pages.workspace.settingsHub.billing.paymentCode",
                  )}
                </th>
                <th className="px-4 py-3 font-medium">
                  {resolveMessage(
                    locale,
                    "pages.workspace.settingsHub.billing.statusLabel",
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-border/70">
                  <td className="px-4 py-3">
                    {formatDate(order.createdAt, locale)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatVnd(order.amountVnd, locale)}
                  </td>
                  <td className="px-4 py-3 font-mono">{order.paymentCode}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(order.status)}>
                      {resolveMessage(locale, orderStatusKeys[order.status])}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="mt-1 block truncate font-medium">{value}</span>
    </div>
  );
}

function Instruction({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value || "—"}</p>
    </div>
  );
}

function statusVariant(
  status: BillingOrderStatus,
): "default" | "secondary" | "destructive" {
  if (status === BILLING_ORDER_STATUSES.CREDITED) return "default";
  if (
    status === BILLING_ORDER_STATUSES.EXPIRED ||
    status === BILLING_ORDER_STATUSES.CANCELLED
  )
    return "destructive";
  return "secondary";
}

function formatVnd(value: string, locale: Locale) {
  try {
    return `${new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(BigInt(value))} VND`;
  } catch {
    return `${value} VND`;
  }
}

function formatCredits(value: string, locale: Locale) {
  try {
    return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(
      BigInt(value),
    );
  } catch {
    return value;
  }
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
