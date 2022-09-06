import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "firebase-admin/auth";
import { initFirebaseAdminApp } from "../../lib/firebase-admin";
import mysql from "mysql2/promise"

type Data = {};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!["GET", "POST", "DELETE"].includes(req.method as string)) {
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

  const connection = await mysql.createConnection(process.env.CONNECTION_STRING as string);
  try {
    const token = await getAuth().verifySessionCookie(req.cookies.session, true);

    switch (req.method) {
      case "GET": {
        const [users, _]: [users: any[], _: any] = await connection.execute('select * from users where firebase_id = ?', [token.uid]);
        if (users.length === 0) {
          res.status(200).json({screenName: ""});
        }
        else {
          res.status(200).json({screenName: users[0].screen_name});
        }
        return;
      }
      case "POST": {
        if (req.body.screenName === undefined || typeof req.body.screenName !== "string") {
          res.status(401).json({});
          return;
        }
        if (10 < req.body.screenName.length) {
          res.status(401).json({});
          return;
        }
        if (/\s/.test(req.body.screenName)) {
          res.status(401).json({});
          return;
        }
        if (req.body.screenName === "") {
          res.status(401).json({});
          return;
        }
        const [users, _]: [users: any[], _: any] = await connection.execute('select * from users where firebase_id = ?', [token.uid]);
        if (users.length === 0) {
          await connection.execute('insert into users (firebase_id, screen_name) values (?, ?)', [token.uid, req.body.screenName]);
          res.status(200).json({});
          return;
        }

        await connection.execute('update users set screen_name = ? where firebase_id = ?', [req.body.screenName, token.uid]);
        res.status(200).json({});
        return;
      }
      case "DELETE": {
        await connection.execute('delete from users where firebase_id = ?', [token.uid]);
        res.status(200).json({});
        return;
      }
    }
  }
  catch (error) {
    console.error(error);
    res.status(401).json({});
  }
  finally {
    await connection.end();
  }
}
