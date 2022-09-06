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
  if (!req.cookies.session) {
    res.status(401).json({});
    return;
  }

  initFirebaseAdminApp();

  try {
    const idToken = await getAuth().verifySessionCookie(req.cookies.session, true);
    await getAuth().revokeRefreshTokens(idToken.sub);
    await getAuth().deleteUser(idToken.sub);
    res.setHeader(
      "Set-Cookie",
      `session=; Max-Age=0; HttpOnly; Path=/${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    );
    res.status(200).json({});
  } catch (error) {
    console.error(error);
    res.status(401).json({});
  }
}
