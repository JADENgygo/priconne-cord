import type { NextPage } from 'next'
import { GetServerSideProps } from "next";
import { signOut, getAuth, signInWithRedirect, TwitterAuthProvider } from "firebase/auth";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { initFirebaseAdminApp } from "../lib/firebase-admin";
import nookies from "nookies";
import { useEffect } from 'react';

type Props = {
  noSession: boolean;
};

const Home: NextPage<Props> = (props: Props) => {
  useEffect(() => {
    // ログイン中にユーザーがクッキーを削除した場合はログアウトする
    const f = async () => {
      if (props.noSession) {
        const auth = getAuth();
        await signOut(auth);
      }
    };
    f();
  }, []);

  return (
    <div className="container pt-3">
      <p>プリコネRのクランバトル管理ツールです。ルームを作成して、凸宣言、凸予約、メンバー管理ができます。</p>
      <p className="fw-bold">注意事項</p>
      <p className="text-danger">アルファ版なので動作が不安定の可能性があります</p>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const cookie = nookies.get(context);
  const session = cookie.session;
  if (!session) {
    return { props: {noSession: true} };
  }

  initFirebaseAdminApp();

  try {
    await getAdminAuth().verifySessionCookie(session, true);
    return {
      redirect: {
        permanent: false,
        destination: "/entrance",
      },
    };
  } catch (error) {
    console.error(error);
    return { props: {noSession: true} };
  }
};

export default Home
