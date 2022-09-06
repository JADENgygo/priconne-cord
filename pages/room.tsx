import type { NextPage } from 'next'
import { GetServerSideProps } from "next";
import { useEffect, useRef, useState } from 'react'
import { initFirebaseAdminApp } from "../lib/firebase-admin";
import nookies from "nookies";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getAuth } from "firebase/auth";
import { useRouter } from 'next/router';
import { Loader } from '../components/loader';
import { Table } from 'react-bootstrap';

type Props = {
  id: string;
};

const Room: NextPage<Props> = (props: Props) => {
  const [reservations, setReservations] = useState([] as {
    user: string,
    round: number,
    boss: number,
    count: number,
  }[]);
  const [target, setTarget] = useState({round: 1, boss: 0, count: 1} as {
    round: number,
    boss: number,
    count: number,
  });
  const [battlers, setBattlers] = useState([[], [], [], [], []] as string[][]);
  const [player, setPlayer] = useState("" as string);
  const [loaded, setLoaded] = useState(false);
  const [startable, setStartable] = useState([true, true, true, true, true]);
  const [members, setMembers] = useState([] as {screenName: string, id: string}[]);
  const [own, setOwn] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approvees, setApprovees] = useState([] as {screenName: string, id: string}[]);
  const [editable, setEditable] = useState({member: false} as {member: boolean});
  const router = useRouter();
  const ref = useRef(false);

  const fetchBattlers = async () => {
    const r = await fetch("/api/battlers?room_id=" + props.id, {method: "GET", headers: {"Content-Type": "application/json"}});
    const j = await r.json();
    const battlers = j.battlers;
    const buf: string[][] = [[], [], [], [], []];
    for (let i = 0; i < battlers.length; ++i) {
      buf[battlers[i].boss].push(battlers[i].user);
    }
    return buf;
  };

  useEffect(() => {
    if (ref.current) {
      return;
    }
    ref.current = true;

    const f = async () => {
      const r = await fetch("/api/rooms?id=" + props.id, {method: "GET", headers: {"Content-Type": "application/json"}});
      const j = await r.json();
      if (j.roomId === "") {
        router.replace("/entrance");
        return;
      }

      const r_ = await fetch("/api/users", {method: "GET", headers: {"Content-Type": "application/json"}});
      const j_ = await r_.json();
      setPlayer(j_.screenName);

      const res_ = await fetch("/api/members?room_id=" + props.id, {method: "GET", headers: {"Content-Type": "application/json"}});
      const json_ = await res_.json();
      const auth = getAuth();
      if (!auth.currentUser) {
        return;
      }
      if (!json_.members.map((e: {_: string, id: string}) => e.id).includes(auth.currentUser.uid)) {
        const res_ = await fetch("/api/approvees?room_id=" + props.id, {method: "GET", headers: {"Content-Type": "application/json"}});
        const json_ = await res_.json();
        setApprovees(json_.approvees);
        setLoaded(true);
        return;
      }
      setMembers(json_.members);

      const buf = await fetchBattlers();
      setBattlers(buf);
      setStartable([...Array(5)].map((_, i) => !buf[i].includes(j_.screenName)));

      const res = await fetch("/api/reservations?room_id=" + props.id, {method: "GET", headers: {"Content-Type": "application/json"}});
      const json = await res.json();
      setReservations(json.reservations);

      {
        const res = await fetch("/api/rooms", {method: "GET", headers: {"Content-Type": "application/json"}});
        const json = await res.json();
        const buf = json.roomId === props.id;
        setOwn(buf);

        if (buf) {
          const url = "/api/approvees?room_id=" + props.id + "&owner=true";
          const res_ = await fetch(url, {method: "GET", headers: {"Content-Type": "application/json"}});
          const json_ = await res_.json();
          setApprovees(json_.approvees);
        }
      }

      setApproved(true);
      setLoaded(true);
    };
    f();
  }, []);

  const addBattler = async (index: number) => {
    setStartable(pre => pre.map((e, i) => i === index ? false : e));
    await fetch("/api/battlers", {method: "POST", body: JSON.stringify({roomId: props.id, boss: index}), headers: {"Content-Type": "application/json"}});
    setBattlers(pre => pre.map((e, i) => i === index ? [...e, player] : e));
  };

  const removeBattler = async (index: number) => {
    setStartable(pre => pre.map((e, i) => i === index ? true : e));
    await fetch(`/api/battlers?room_id=${props.id}&boss=${index}`, {method: "DELETE", headers: {"Content-Type": "application/json"}});
    setBattlers(pre => pre.map((e, i) => i === index ? e.filter(el => el !== player) : e));
  };

  const addReservation = async () => {
    setReservations(pre => [...pre, {user: player, round: target.round, boss: target.boss, count: target.count}]);
    await fetch("/api/reservations", {method: "POST", body: JSON.stringify({roomId: props.id, round: target.round, boss: target.boss, count: target.count}), headers: {"Content-Type": "application/json"}});
  };

  const removeReservation = async (round: number, boss: number) => {
    setReservations(pre => pre.filter(e => e.user !== player || e.round !== round || e.boss !== boss));
    await fetch(`/api/reservations?room_id=${props.id}&round=${round}&boss=${boss}`, {method: "DELETE", headers: {"Content-Type": "application/json"}});
  };

  const update = async () => {
    setLoaded(false);

    const res_ = await fetch("/api/members?room_id=" + props.id, {method: "GET", headers: {"Content-Type": "application/json"}});
    const json_ = await res_.json();
    const auth = getAuth();
    if (!auth.currentUser) {
      return;
    }
    if (!json_.members.map((e: {_: string, id: string}) => e.id).includes(auth.currentUser.uid)) {
      router.push("/entrance");
      return;
    }
    setMembers(json_.members);

    const buf = await fetchBattlers();
    setBattlers(buf);

    const res = await fetch("/api/reservations?room_id=" + props.id, {method: "GET", headers: {"Content-Type": "application/json"}});
    const json = await res.json();
    setReservations(json.reservations);

    if (own) {
      const res_ = await fetch("/api/approvees?room_id=" + props.id + "&owner=true", {method: "GET", headers: {"Content-Type": "application/json"}});
      const json_ = await res_.json();
      setApprovees(json_.approvees);
    }

    setLoaded(true);
  };

  const removeMember = async (userId: string) => {
    setMembers(pre => pre.filter(e => e.id !== userId));
    setLoaded(false);
    await fetch(`/api/battlers?room_id=${props.id}&user_id=${userId}`, {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch(`/api/reservations?room_id=${props.id}&user_id=${userId}`, {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch(`/api/members?room_id=${props.id}&user_id=${userId}`, {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await update();
  };

  const approve = async (screenName: string, userId: string) => {
    setApprovees(pre => pre.filter(e => e.id !== userId));
    setMembers(pre => [...pre, {screenName, id: userId}]);
    await fetch(`/api/members`, {method: "POST", body: JSON.stringify({roomId: props.id, userId}), headers: {"Content-Type": "application/json"}});
    await fetch(`/api/approvees?room_id=${props.id}&user_id=${userId}`, {method: "DELETE", headers: {"Content-Type": "application/json"}});
  };

  const decline = async (userId: string) => {
    setApprovees(pre => pre.filter(e => e.id !== userId));
    await fetch(`/api/approvees?room_id=${props.id}&user_id=${userId}`, {method: "DELETE", headers: {"Content-Type": "application/json"}});
  };

  const sendApprovalRequest = async () => {
    const auth = getAuth();
    if (!auth.currentUser) {
      return;
    }
    const id = auth.currentUser.uid;
    setApprovees(pre => [...pre, {screenName: player, id}])
    await fetch("/api/approvees", {method: "POST", body: JSON.stringify({roomId: props.id}), headers: {"Content-Type": "application/json"}});
  };

  const removeApprovalRequest = async () => {
    setApprovees([]);
    await fetch("/api/approvees?room_id=" + props.id, {method: "DELETE", headers: {"Content-Type": "application/json"}});
  };

  if (loaded && !approved) {
    return (
      <div className="text-center mt-3">
        {
          approvees.map(e => e.screenName).includes(player) ? (
            <div>
              <div>ルームオーナーの承認待ちです</div>
              <button type="button" className="btn btn-dark mt-3" onClick={removeApprovalRequest}>承認リクエストを取り消す</button>
            </div>
          ) : (
            <button type="button" className="btn btn-dark mt-3" onClick={sendApprovalRequest}>承認リクエストを送る</button>
          )
        }
      </div>
    );
  }

  return (
    loaded ? (
      <div className="container mt-3">
        <button type="button" className="btn btn-dark" onClick={update}>画面を更新</button>
        <hr />
        <p className="fw-bold">ユーザー</p>
        <p>{ player }</p>
        <p className="fw-bold">ルームID</p>
        <p style={{overflowWrap: "break-word"}}>{ props.id }</p>
        <hr />
        <div className="fw-bold mt-3">凸宣言</div>
        <div className="row mt3 gx-0 gy-3">
          {
            [...Array(5)].map((_, i) => (
              <div key={i} className="col-6 col-sm-4 col-md-3 col-lg-2 text-center">
                ボス{i + 1}<br />
                <button type="button" className="btn btn-dark mt-3" disabled={!startable[i]} onClick={() => addBattler(i)}>凸開始</button><br />
                <button type="button" className="btn btn-dark mt-3" disabled={startable[i]} onClick={() => removeBattler(i)}>凸終了</button>
              </div>
            ))
          }
        </div>
        <hr />
        <div className="fw-bold mt-3">凸者一覧</div>
        <div className="row gx-0 gy-3">
          {
            [...Array(5)].map((_, index) => (
              <div key={index} className="col-6 col-sm-4 col-md-3 col-lg-2 text-center">
                <div className="mb-3">ボス{index + 1}</div>
                {
                  battlers[index].map((e, i) => (
                    <div key={i} style={{whiteSpace: "pre-wrap"}} className="mb-1">{ e }</div>
                  ))
                }
              </div>
            ))
          }
        </div>
        <hr />
        <div className="fw-bold mt-3">凸予約</div>
        <select className="form-select mt-3" value={target.round} onChange={(e) => setTarget(pre => ({...pre, round: parseInt(e.target.value)}))}>
          {
            [...Array(100)].map((_, i) => (
              <option key={i} value={i + 1}>{ (i + 1) + "週目"}</option>
            ))
          }
        </select>
        <select className="form-select" value={target.boss} onChange={e => setTarget(pre => ({...pre, boss: parseInt(e.target.value)}))}>
          {
            [...Array(5)].map((_, i) => (
              <option key={i} value={i}>{ "ボス" + (i + 1) }</option>
            ))
          }
        </select>
        <select className="form-select" value={target.count} onChange={e => setTarget(pre => ({...pre, count: parseInt(e.target.value)}))}>
          {
            [...Array(3)].map((_, i) => (
              <option key={i} value={i + 1}>{ "凸数: " + (i + 1) }</option>
            ))
          }
        </select>
        <button type="button" className="btn btn-dark mt-3" onClick={addReservation} disabled={
          reservations.find(e => e.user === player && e.round === target.round && e.boss === target.boss) !== undefined
        }>予約</button>
        <hr />
        <div className="fw-bold my-3">凸予約者</div>
        {
          reservations.length === 0 ? (
            <div>なし</div>
          ) : (
            <Table responsive striped size="sm" className="text-center align-middle">
              <thead className="text-nowrap">
                <tr>
                  <th>週目</th>
                  <th>ボス</th>
                  <th>凸数</th>
                  <th>ユーザー</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {
                  reservations.sort((a, b) => {
                    if (a.round !== b.round) {
                      return a.round - b.round;
                    }
                    if (a.boss !== b.boss) {
                      return a.boss - b.boss;
                    }
                    return a.user.toLowerCase() < b.user.toLowerCase() ? -1 : 1;
                  }).map(e => (
                    <tr key={`${e.user}${e.round}${e.boss}${e.count}`} className="mb-3">
                      <td>{ e.round }</td>
                      <td>{ e.boss + 1 }</td>
                      <td>{ e.count }</td>
                      <td>{ e.user }</td>
                      <td>
                        { player === e.user && <button type="button" className="btn btn-dark text-nowrap ms-3" onClick={() => removeReservation(e.round, e.boss)}>削除</button> }
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </Table>
          )
        }
        <hr />
        <div className="fw-bold mt-3">メンバー</div>
        <Table responsive striped size="sm" className="text-center align-middle">
          <thead className="text-nowrap">
            <tr>
              <th></th>
              <th>ユーザー</th>
              <th>オーナー</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {
              members.sort((a, b) => {
                return a.screenName.toLowerCase() < b.screenName.toLowerCase() ? -1 : 1;
              }).map((e, i) => (
                <tr key={i} className="mb-3">
                  <td>{ i + 1 }</td>
                  <td>{ e.screenName }</td>
                  <td>{ e.screenName === player ? "〇" : "" }</td>
                  <td>
                    { own && editable.member && e.screenName !== player && <button type="button" className="btn btn-dark text-nowrap ms-3" onClick={() => removeMember(e.id)}>除名</button> }
                  </td>
                </tr>
              ))
            }
          </tbody>
        </Table>
        {
          own && (
            <>
              <button type="button" className="btn btn-dark" onClick={() => setEditable(pre => ({...pre, member: !pre.member}))}>{ editable.member ? "終了" : "編集" }</button>
              <hr />
              <div className="fw-bold mt-3">承認待ち</div>
              {
                approvees.length === 0 ? (
                  <div className="mt-3">なし</div>
                ) : (
                  <Table responsive striped size="sm" className="text-center align-middle">
                    <thead className="text-nowrap">
                      <tr>
                        <th></th>
                        <th>ユーザー</th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        approvees.sort((a, b) => {
                          return a.screenName.toLowerCase() < b.screenName.toLowerCase() ? -1 : 1;
                        }).map((e, i) => (
                          <tr key={i} className="mb-3">
                            <td>{ i + 1 }</td>
                            <td>{ e.screenName }</td>
                            <td>
                              <button type="button" className="btn btn-dark text-nowrap ms-3" onClick={() => approve(e.screenName, e.id)}>承認</button>
                            </td>
                            <td>
                              <button type="button" className="btn btn-dark text-nowrap ms-3" onClick={() => decline(e.id)}>拒否</button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </Table>
                )
              }
            </>
          )
        }
      </div>
    ) : <Loader />
  )
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

    if (context.query.id === undefined) {
      return {
        redirect: {
          permanent: false,
          destination: "/entrance",
        },
      };
    }

    return { props: {id: context.query.id} };
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

export default Room
