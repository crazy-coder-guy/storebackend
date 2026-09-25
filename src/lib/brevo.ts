import { config } from '../config';
import { AppError } from '../utils/AppError';

const BASE_URL = 'https://api.brevo.com/v3';
const LIST_NAME = 'Kaiira Newsletter';

async function brevoRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!config.brevo.apiKey) {
    throw new AppError(500, 'BREVO_NOT_CONFIGURED', 'Brevo API key is not configured');
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'api-key': config.brevo.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AppError(502, 'BREVO_ERROR', `Brevo API ${method} ${path} failed (${res.status}): ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

let cachedListId: number | null = null;

async function getOrCreateListId(): Promise<number> {
  if (cachedListId) return cachedListId;

  const { lists } = await brevoRequest<{ lists: { id: number; name: string }[] }>(
    'GET',
    '/contacts/lists?limit=50&sort=desc'
  );
  const existing = lists?.find((list) => list.name === LIST_NAME);
  if (existing) {
    cachedListId = existing.id;
    return existing.id;
  }

  const { folders } = await brevoRequest<{ folders: { id: number }[] }>('GET', '/contacts/folders?limit=1');
  const folderId = folders?.[0]?.id;
  if (!folderId) {
    throw new AppError(502, 'BREVO_ERROR', 'No Brevo contact folder available to create the newsletter list in');
  }

  const created = await brevoRequest<{ id: number }>('POST', '/contacts/lists', {
    name: LIST_NAME,
    folderId,
  });
  cachedListId = created.id;
  return created.id;
}

export async function syncContactToBrevo(email: string) {
  const listId = await getOrCreateListId();
  await brevoRequest('POST', '/contacts', { email, listIds: [listId], updateEnabled: true });
}

export async function removeContactFromBrevo(email: string) {
  await brevoRequest('DELETE', `/contacts/${encodeURIComponent(email)}`);
}

interface CreateCampaignInput {
  subject: string;
  htmlContent: string;
  sendNow: boolean;
  scheduledAt?: string;
}

export async function createCampaign(input: CreateCampaignInput) {
  if (!config.brevo.senderEmail) {
    throw new AppError(500, 'BREVO_NOT_CONFIGURED', 'BREVO_SENDER_EMAIL is not configured');
  }

  const listId = await getOrCreateListId();

  // Brevo's create-campaign endpoint rejects the request with a misleading
  // "no contacts associated with the given recipients info" error whenever
  // `recipients` is included in the same POST body — even against a list
  // that demonstrably has confirmed, non-blacklisted contacts. Creating the
  // campaign first and attaching recipients via a separate PUT avoids it.
  const campaign = await brevoRequest<{ id: number }>('POST', '/emailCampaigns', {
    name: `${input.subject} — ${new Date().toISOString()}`,
    subject: input.subject,
    sender: { name: config.brevo.senderName, email: config.brevo.senderEmail },
    type: 'classic',
    htmlContent: input.htmlContent,
    ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
  });

  await brevoRequest('PUT', `/emailCampaigns/${campaign.id}`, {
    recipients: { listIds: [listId] },
  });

  if (input.sendNow) {
    await brevoRequest('POST', `/emailCampaigns/${campaign.id}/sendNow`);
  }

  return campaign;
}

export async function listCampaigns() {
  return brevoRequest<{
    campaigns: {
      id: number;
      name: string;
      subject: string;
      status: string;
      createdAt: string;
      sentDate: string | null;
      statistics?: { globalStats?: { sent?: number; delivered?: number; opens?: number; clicks?: number } };
    }[];
  }>('GET', '/emailCampaigns?limit=50&sort=desc');
}
