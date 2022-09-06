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
          res.status(401).json({});
          return;
        }
        const [members, _]: [members: any[], _: any] = await connection.execute('select * from members where room_id = ?', [req.query.room_id]);
        if (members.length === 0 || !members.map(e => e.firebase_id).includes(token.uid)) {
          res.status(401).json({});
          return;
        }
        const [reservations, __]: [reservations: any[], __: any] = await connection.execute('select * from users a join reservations b on a.firebase_id = b.user where b.room_id = ?', [req.query.room_id]);
        res.status(200).json({reservations: reservations.map(e => ({user: e.screen_name, round: e.round, boss: e.boss, count: e.count}))});
        return;
      }
      case "POST": {
        if (req.body.roomId === undefined || typeof req.body.roomId !== "string") {
          res.status(401).json({});
          return;
        }
        if (req.body.round === undefined || typeof req.body.round !== "number" || !(1 <= req.body.round && req.body.round <= 100)) {
          res.status(401).json({});
          return;
        }
        if (req.body.boss === undefined || typeof req.body.boss !== "number" || ![0, 1, 2, 3, 4].includes(req.body.boss)) {
          res.status(401).json({});
          return;
        }
        if (req.body.count === undefined || typeof req.body.count !== "number" || !(1 <= req.body.count && req.body.count <= 3)) {
          res.status(401).json({});
          return;
        }
        const [members, _]: [members: any[], _: any] = await connection.execute('select * from members where room_id = ?', [req.body.roomId]);
        if (members.length === 0 || !members.map(e => e.firebase_id).includes(token.uid)) {
          res.status(401).json({});
          return;
        }
        await connection.execute('insert into reservations (room_id, user, round, boss, count) values (?, ?, ?, ?, ?)', [req.body.roomId, token.uid, req.body.round, req.body.boss, req.body.count]);
        res.status(200).json({});
        return;
      }
      case "DELETE": {
        if (req.query.truncation !== undefined) {
          await connection.execute('delete from reservations where user = ?', [token.uid]);
          res.status(200).json({});
          return;
        }

        if (req.query.room_id === undefined) {
          res.status(401).json({});
          return;
        }

        if (req.query.round === undefined && req.query.boss === undefined) {
          const [rooms, _]: [rooms: any[], _: any] = await connection.execute('select * from rooms where user = ?', [token.uid]);
          if (rooms.length === 0 || rooms[0].id !== req.query.room_id) {
            res.status(401).json({});
            return;
          }
          if (req.query.user_id === undefined) {
            await connection.execute('delete from reservations where room_id = ?', [req.query.room_id]);
            res.status(200).json({});
            return;
          }
          await connection.execute('delete from reservations where room_id = ? and user = ?', [req.query.room_id, req.query.user_id]);
          res.status(200).json({});
          return;
        }

        const round = parseInt(req.query.round as string);
        if (req.query.round === undefined || !(1 <= round && round <= 100)) {
          res.status(401).json({});
          return;
        }
        if (req.query.boss === undefined || !["0", "1", "2", "3", "4"].includes(req.query.boss as string)) {
          res.status(401).json({});
          return;
        }

        const [members, _]: [members: any[], _: any] = await connection.execute('select * from members where room_id = ?', [req.query.room_id]);
        if (members.length === 0 || !members.map(e => e.firebase_id).includes(token.uid)) {
          res.status(401).json({});
          return;
        }

        await connection.execute('delete from reservations where room_id = ? and user = ? and round = ? and boss = ?', [req.query.room_id, token.uid, round, parseInt(req.query.boss as string)]);
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
