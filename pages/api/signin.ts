import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "firebase-admin/auth";
import { initFirebaseAdminApp } from "../../lib/firebase-admin";

type Data = {};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== "POST") {
    res.status(405).json({});
    return;
  }
  if (req.headers["content-type"] !== "application/json") {
    res.status(401).json({});
    return;
  }
  if (!req.body.session) {
    res.status(401).json({});
    return;
  }

  initFirebaseAdminApp();

  const expiresIn = 1000 * 60 * 60 * 24 * 7;
  try {
    const cookie = await getAuth().createSessionCookie(req.body.session, {
      expiresIn,
    });
    res.setHeader(
      "Set-Cookie",
      `session=${cookie}; Max-Age=${expiresIn}; HttpOnly; Path=/${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    );
    res.status(200).json({});
    return;
  } catch (error) {
    console.error(error);
    res.status(401).json({});
  }
}
