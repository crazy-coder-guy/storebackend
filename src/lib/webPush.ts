import webPush from 'web-push';
import { config } from '../config';

if (config.vapid.publicKey && config.vapid.privateKey) {
  webPush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
}

export { webPush };
