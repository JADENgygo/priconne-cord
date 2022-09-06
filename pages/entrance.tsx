import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { GetServerSideProps } from "next";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getAuth } from "firebase/auth";
import { initFirebaseAdminApp } from "../lib/firebase-admin";
import nookies from "nookies";
import { useEffect, useRef, useState } from 'react';
import { Loader } from '../components/loader';
import Link from 'next/link';

const Entrance: NextPage = () => {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [specificId, setSpecificId] = useState("");
  const [deletable, setDeletable] = useState(false);
  const [sign, setSign] = useState("");
  const [found, setFound] = useState(true);
  const [userName, setUserName] = useState("");
  const [validation, setValidation] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState([] as string[]);
  const [approvees, setApprovees] = useState([] as string[]);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) {
      return;
    }
    ref.current = true;

    const f = async () => {
      const r = await fetch("/api/rooms", {method: "GET", headers: {"Content-Type": "application/json"}});
      const j = await r.json();
      setRoomId(j.roomId);

      const res = await fetch(`/api/members?room_list=true`, {method: "GET", headers: {"Content-Type": "application/json"}});
      const json = await res.json();
      setJoinedRooms(json.rooms);

      const res_ = await fetch(`/api/approvees`, {method: "GET", headers: {"Content-Type": "application/json"}});
      const json_ = await res_.json();
      setApprovees(json_.rooms);

      const r_ = await fetch("/api/users", {method: "GET", headers: {"Content-Type": "application/json"}});
      const j_ = await r_.json();
      setUserName(j_.screenName);
      setPrepared(j_.screenName !== "");
      setLoaded(true);
    };
    f();
  }, []);

  const createId = async () => {
    setLoaded(false);
    const r = await fetch("/api/rooms", {method: "POST", headers: {"Content-Type": "application/json"}});
    const j = await r.json();
    setRoomId(j.roomId);
    setJoinedRooms(pre => [...pre, j.roomId]);

    const auth = getAuth();
    if (!auth.currentUser) {
      return;
    }
    await fetch("/api/members", {method: "POST", body: JSON.stringify({roomId: j.roomId}), headers: {"Content-Type": "application/json"}});
    setLoaded(true);
  };

  const deleteId = async () => {
    setLoaded(false);
    setDeletable(false);
    setSign("");

    await fetch("/api/battlers?room_id=" + roomId, {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch("/api/reservations?room_id=" + roomId, {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch("/api/approvees?room_id=" + roomId + "&all=true", {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch("/api/members?room_id=" + roomId, {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch("/api/rooms", {method: "DELETE", headers: {"Content-Type": "application/json"}});
    setJoinedRooms(pre => pre.filter(e => e !== roomId));
    setRoomId("");

    setLoaded(true);
  };

  const enterRoom = async () => {
    setLoaded(false);
    const r = await fetch("/api/rooms?id=" + specificId, {method: "GET", headers: {"Content-Type": "application/json"}});
    const j = await r.json();
    if (j.roomId === "") {
      setFound(false);
      setLoaded(true);
      return;
    }
    router.push("/room?id=" + specificId);
  };

  const updateUserName = async () => {
    if (10 < userName.length) {
      setValidation("ユーザーネームは10文字以内にして下さい");
      return;
    }
    if (/\s/.test(userName)) {
      setValidation("ユーザーネームに空白は使えません");
      return;
    }
    if (userName === "") {
      setValidation("ユーザーネームを入力して下さい");
      return;
    }
    setLoaded(false);
    const res = await fetch(`/api/users`, {method: "POST", body: JSON.stringify({screenName: userName}), headers: {"Content-Type": "application/json"}});
    if (res.ok) {
      setPrepared(true);
      setValidation("");
    }
    else {
      setValidation("既に使われているユーザーネームです");
    }
    setLoaded(true);
  };

  return (
    loaded ? (
      <div className="container pt-3">
        <label className="form-label fw-bold" htmlFor='username'>ユーザーネーム</label>
        <input type="text" className="form-control" value={userName} id="username" onChange={e => setUserName(e.target.value)} />
        <button type="button" className="btn btn-dark mt-3" onClick={updateUserName}>変更</button>
        { validation !== "" && <div className="text-danger mt-3">{ validation }</div> }
        {
          prepared && (
            <>
              <hr />
              <div className="fw-bold mb-3">オーナールーム</div>
              {
                roomId === "" ? (
                  <div>なし</div>
                ) : (
                  <div>
                    <div><Link href={"/room?id=" + roomId}><a>ルーム</a></Link></div>
                    <div style={{overflowWrap: "break-word"}}>ID:&nbsp;{ roomId }</div>
                  </div>
                )
              }
              <div className="row">
                <div className="col-6">
                  <button type="button" className="btn btn-dark mt-3" disabled={roomId !== ""} onClick={createId}>ルームを作成</button>
                </div>
                <div className="col-6 text-end">
                  { !deletable && <button type="button" className="btn btn-danger mt-3" disabled={roomId === ""} onClick={() => setDeletable(true)}>ルームを削除</button> }
                </div>
                {
                  deletable && (
                    <div className="col">
                      <button type="button" className="btn btn-danger mt-3 me-3" disabled={sign !== "プリコネ"} onClick={deleteId}>ルームを削除</button>
                      <button type="button" className="btn btn-dark mt-3" onClick={() => {
                        setDeletable(false);
                        setSign("");
                      }}>キャンセル</button>
                      <div>
                        <label className="form-label mt-3" htmlFor="delete">削除する場合は「プリコネ」と入力します</label>
                        <input type="text" className="form-control" id="delete" value={sign} onChange={e => setSign(e.target.value)} />
                      </div>
                    </div>
                  )
                }
              </div>
              <hr />
              <div className="fw-bold">参加済みルーム</div>
              <div className="row">
                { joinedRooms.length === 0 && <div className="mt-3">なし</div> }
                {
                  joinedRooms.map((e, i) => (
                    <div className="col-12 gy-3" key={e}>
                      <div><Link href={"/room?id=" + e}><a>ルーム{ i + 1 }</a></Link></div>
                      <div style={{overflowWrap: "break-word"}}>ID:&nbsp;{ e }</div>
                    </div>
                  ))
                }
              </div>
              <hr />
              <div className="fw-bold">承認待ちルーム</div>
              <div className="row">
                { approvees.length === 0 && <div className="mt-3">なし</div> }
                {
                  approvees.map((e, i) => (
                    <div className="col-12 gy-3" key={e}>
                      <div><Link href={"/room?id=" + e}><a>ルーム{ i + 1 }</a></Link></div>
                      <div style={{overflowWrap: "break-word"}}>ID:&nbsp;{ e }</div>
                    </div>
                  ))
                }
              </div>
              <hr />
              <label className="form-label fw-bold" htmlFor="enter">指定のIDのルームに参加</label>
              <input type="text" className="form-control" id="enter" value={specificId} onChange={e => setSpecificId(e.target.value)} />
              <button type="button" className="btn btn-dark mt-3" onClick={enterRoom}>参加</button>
              { !found && <div className="text-danger mt-3">指定のIDのルームは存在しません</div> }
            </>
          )
        }
      </div>
    ) : <Loader />
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const cookie = nookies.get(context);
  const session = cookie.session;
  if (!session) {
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
    };
  }

  initFirebaseAdminApp();

  try {
    await getAdminAuth().verifySessionCookie(session, true);
    return { props: {} };
  }
  catch (error) {
    console.error(error);
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
    };
  }
};

export default Entrance
