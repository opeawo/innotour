import { db } from "@/db";
import { auditLog } from "@/db/schema";

export async function logAudit(params: {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLog).values({
    tenantId: params.tenantId,
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    reason: params.reason || null,
    metadata: params.metadata || {},
  });
}
