import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config';

// Verifying ID tokens only needs the project id (to know which issuer/public
// keys to check against) — it does not require a service account credential.
if (!getApps().length) {
  initializeApp({ projectId: config.firebase.projectId });
}

export const firebaseAuth = getAuth();
