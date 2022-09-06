import { getApps, initializeApp, cert } from "firebase-admin/app";
import { ServiceAccount } from "firebase-admin";

export const initFirebaseAdminApp = () => {
  const credential: ServiceAccount = {
    projectId: process.env.PROJECT_ID,
    privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.CLIENT_EMAIL,
  };

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(credential),
    });
  }
};
