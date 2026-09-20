import type {
  BillingAdminDashboard,
  BillingAdminGateway,
  BillingAdminPeriod,
  BillingAdminPaymentFilter,
} from "@lcsp/contracts/billing";
import { apiRequest } from "./api-request";

export type AdminBillingQuery = {
  period: BillingAdminPeriod;
  status: BillingAdminPaymentFilter;
  gateway: BillingAdminGateway;
  page: number;
  pageSize: number;
};

export async function fetchAdminBilling(
  query: AdminBillingQuery,
): Promise<BillingAdminDashboard> {
  const params = new URLSearchParams({
    period: query.period,
    status: query.status,
    gateway: query.gateway,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  const response = await apiRequest(`/api/admin/billing?${params}`);
  if (!response.ok) {
    throw new Error(response.problemCode ?? "ADMIN_BILLING_FAILED");
  }
  return response.payload as BillingAdminDashboard;
}
