import React, { useState } from "react";
import type { NextPage } from "next";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import nookies from "nookies";
import { initFirebaseAdminApp } from "../lib/firebase-admin";
import { Loader } from "../components/loader";

const Delete: NextPage = () => {
  const [disabled, setDisabled] = useState(true);
  const [loaded, setLoaded] = useState(true);
  const router = useRouter();

  const confirm = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDisabled(event.target.value !== "プリコネ");
  };

  const deleteAccount = async () => {
    setLoaded(false);
    const r = await fetch("/api/rooms", {method: "GET", headers: {"Content-Type": "application/json"}});
    const j = await r.json();
    const roomId = j.roomId;;
    if (roomId !== "") {
      await fetch("/api/battlers?room_id=" + roomId, {method: "DELETE", headers: {"Content-Type": "application/json"}});
      await fetch("/api/reservations?room_id=" + roomId, {method: "DELETE", headers: {"Content-Type": "application/json"}});
      await fetch("/api/approvees?room_id=" + roomId + "&all=true", {method: "DELETE", headers: {"Content-Type": "application/json"}});
      await fetch("/api/members?room_id=" + roomId, {method: "DELETE", headers: {"Content-Type": "application/json"}});
    }

    await fetch("/api/battlers?truncation=true", {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch("/api/reservations?truncation=true", {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch("/api/approvees?truncation=true", {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch("/api/members?truncation=true", {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch("/api/rooms", {method: "DELETE", headers: {"Content-Type": "application/json"}});
    await fetch("/api/users", {method: "DELETE", headers: {"Content-Type": "application/json"}});

    await fetch("/api/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    router.reload();
  };

  return (
    loaded ? (
      <div className="container mt-3">
        <div>
          アカウントを削除する場合は「プリコネ」と入力してください
          <input
            type="text"
            className="form-control mt-3"
            onChange={confirm}
            id="confirm"
          />
          <button
            type="button"
            className="mt-3 btn btn-outline-danger"
            disabled={disabled}
            onClick={deleteAccount}
            id="deleteButton"
          >
            アカウント削除
          </button>
        </div>
      </div>
    ) : <Loader />
  );
};

export default Delete;

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
  } catch (error) {
    console.error(error);
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
    };
  }
};
