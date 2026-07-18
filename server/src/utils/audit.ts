import { ClientSession } from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import { AccessTokenPayload } from './jwt';

interface AuditInput {
  user?: AccessTokenPayload;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  session?: ClientSession;
}

// Best-effort audit record for sensitive actions. Never throws to the caller.
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await AuditLog.create(
      [
        {
          userId: input.user?.sub,
          userName: input.user?.name,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          meta: input.meta,
        },
      ],
      input.session ? { session: input.session } : {}
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[audit] failed to record', input.action, e);
  }
}
