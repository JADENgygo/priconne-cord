import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "firebase-admin/auth";
import { initFirebaseAdminApp } from "../../lib/firebase-admin";
import mysql from "mysql2/promise"
import { v4 as uuidv4 } from "uuid"
import { createHash } from "crypto"

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
        if (req.query.id === undefined) {
          const [rooms, _]: [rooms: any[], _: any] = await connection.execute('select * from rooms where user = ?', [token.uid]);
          if (rooms.length === 0) {
            res.status(200).json({roomId: ""});
          }
          else {
            res.status(200).json({roomId: rooms[0].id});
          }
          return;
        }

        const [rooms, _]: [rooms: any[], _: any] = await connection.execute('select * from rooms where id = ?', [req.query.id]);
        if (rooms.length === 0) {
          res.status(200).json({roomId: ""});
        }
        else {
          res.status(200).json({roomId: req.query.id});
        }
        return;
      }
      case "POST": {
        const uuid = uuidv4();
        const hash = createHash("sha256");
        hash.update(uuid);
        const roomId = hash.digest('hex');
        await connection.execute('insert into rooms (user, id) values (?, ?)', [token.uid, roomId]);
        res.status(200).json({roomId});
        return;
      }
      case "DELETE": {
        await connection.execute('delete from rooms where user = ?', [token.uid]);
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
