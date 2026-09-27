import type { Server as HTTPServer } from 'http';
import { Server as IOServer } from 'socket.io';

// Broad, coarse-grained entity types — one per "thing a list or detail page
// on either frontend queries". Kept intentionally generic (not one event per
// service method) so both frontends can map an entity straight to the
// react-query keys it affects, instead of maintaining a huge 1:1 event list.
export type RealtimeEntity =
  | 'product'
  | 'category'
  | 'color'
  | 'size'
  | 'inventory'
  | 'order'
  | 'review'
  | 'exchange'
  | 'newsletter'
  | 'storefront';

export type RealtimeAction = 'created' | 'updated' | 'deleted';

export interface RealtimeEvent {
  entity: RealtimeEntity;
  action: RealtimeAction;
  id?: string;
  at: number;
}

let io: IOServer | null = null;

export function initRealtime(httpServer: HTTPServer): IOServer {
  io = new IOServer(httpServer, {
    cors: { origin: '*' },
  });
  return io;
}

// Fire-and-forget: broadcasts a coarse "this changed" signal to every
// connected client. Deliberately carries no row data — clients already know
// how to fetch the entity they care about, this just tells them *when* to
// refetch. Safe to call even if a socket connection fails elsewhere; a
// missed broadcast just means a client waits for its next natural refetch.
export function emitRealtime(entity: RealtimeEntity, action: RealtimeAction, id?: string) {
  if (!io) return;
  const event: RealtimeEvent = { entity, action, id, at: Date.now() };
  io.emit('realtime:event', event);
}
