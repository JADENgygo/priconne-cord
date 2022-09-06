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
        if (req.query.owner === undefined) {
          if (req.query.room_id === undefined) {
            const [approvees, _]: [approvees: any[], _: any] = await connection.execute('select * from approvees where firebase_id = ?', [token.uid]);
            res.status(200).json({rooms: approvees.map(e => e.room_id)});
            return;
          }
          const [approvees, _]: [approvees: any[], _: any] = await connection.execute('select * from users a join approvees b on a.firebase_id = b.firebase_id where b.room_id = ? and b.firebase_id = ?', [req.query.room_id, token.uid]);
          res.status(200).json({approvees: approvees.map(e => ({screenName: e.screen_name, id: e.firebase_id}))});
          return;
        }

        if (req.query.room_id === undefined) {
          res.status(401).json({});
          return;
        }

        const [rooms, _]: [rooms: any[], _: any] = await connection.execute('select * from rooms where user = ?', [token.uid]);
        if (rooms.length === 0 || rooms[0].id !== req.query.room_id) {
          res.status(401).json({});
          return;
        }

        const [users, __]: [users: any[], __: any] = await connection.execute('select * from users a join approvees b on a.firebase_id = b.firebase_id where b.room_id = ?', [req.query.room_id]);
        res.status(200).json({approvees: users.map(e => ({screenName: e.screen_name, id: e.firebase_id}))});
        return;
      }
      case "POST": {
        if (req.body.roomId === undefined || typeof req.body.roomId !== "string") {
          res.status(401).json({});
          return;
        }
        await connection.execute('insert into approvees (room_id, firebase_id) values (?, ?)', [req.body.roomId, token.uid]);
        res.status(200).json({});
        return;
      }
      case "DELETE": {
        if (req.query.truncation !== undefined) {
          await connection.execute('delete from approvees where firebase_id = ?', [token.uid]);
          res.status(200).json({});
          return;
        }

        if (req.query.room_id === undefined) {
          res.status(401).json({});
          return;
        }

        if (req.query.user_id === undefined && req.query.all === undefined) {
          await connection.execute('delete from approvees where room_id = ? and firebase_id = ?', [req.query.room_id, token.uid]);
          res.status(200).json({});
          return;
        }

        const [rooms, _]: [rooms: any[], _: any] = await connection.execute('select * from rooms where user = ?', [token.uid]);
        if (rooms.length === 0 || rooms[0].id !== req.query.room_id) {
          res.status(401).json({});
          return;
        }

        if (req.query.all !== undefined) {
          await connection.execute('delete from approvees where room_id = ?', [req.query.room_id]);
          res.status(200).json({});
          return;
        }

        await connection.execute('delete from approvees where room_id = ? and firebase_id = ?', [req.query.room_id, req.query.user_id]);
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
