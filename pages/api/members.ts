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
        if (req.query.room_id === undefined) {
          if (req.query.room_list === undefined) {
            res.status(401).json({});
            return;
          }
          const [members, _]: [members: any[], _: any] = await connection.execute('select * from members where firebase_id = ?', [token.uid]);
          res.status(200).json({rooms: members.map(e => e.room_id)});
          return;
        }

        const [members, _]: [members: any[], _: any] = await connection.execute('select * from members where room_id = ?', [req.query.room_id]);
        if (members.length === 0 || !members.map(e => e.firebase_id).includes(token.uid)) {
          res.status(200).json({members: []});
          return;
        }
        const [users, __]: [users: any[], __: any] = await connection.execute('select * from users a join members b on a.firebase_id = b.firebase_id where b.room_id = ?', [req.query.room_id]);
        res.status(200).json({members: users.map(e => ({screenName: e.screen_name, id: e.firebase_id}))});
        return;
      }
      case "POST": {
        if (req.body.roomId === undefined || typeof req.body.roomId !== "string") {
          res.status(401).json({});
          return;
        }

        const [rooms, _]: [rooms: any[], _: any] = await connection.execute('select * from rooms where user = ?', [token.uid]);
        if (rooms.length === 0 || rooms[0].id !== req.body.roomId) {
          res.status(401).json({});
          return;
        }

        if (req.body.userId === undefined) {
          await connection.execute('insert into members (room_id, firebase_id) values (?, ?)', [req.body.roomId, token.uid]);
          res.status(200).json({});
          return;
        }

        if (typeof req.body.userId !== "string") {
          res.status(401).json({});
          return;
        }
        const [approvees, __]: [approvees: any[], __: any] = await connection.execute('select * from approvees where room_id = ?', [req.body.roomId]);
        if (approvees.length === 0 || !approvees.map(e => e.firebase_id).includes(req.body.userId)) {
          res.status(401).json({});
          return;
        }
        await connection.execute('insert into members (room_id, firebase_id) values (?, ?)', [req.body.roomId, req.body.userId]);
        res.status(200).json({});
        return;
      }
      case "DELETE": {
        if (req.query.truncation !== undefined) { 
          await connection.execute('delete from members where firebase_id = ?', [token.uid]);
          res.status(200).json({});
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

        if (req.query.user_id === undefined) {
          await connection.execute('delete from members where room_id = ?', [req.query.room_id]);
          res.status(200).json({});
          return;
        }

        await connection.execute('delete from members where room_id = ? and firebase_id = ?', [req.query.room_id, req.query.user_id]);
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
