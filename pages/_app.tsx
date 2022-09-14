import '../styles/globals.css'
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import type { AppProps } from 'next/app'
import { useEffect, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import { User, onAuthStateChanged, getAuth, getRedirectResult, } from "firebase/auth";
import { useRouter } from "next/router";
import { Loader } from '../components/loader';
import { Header } from '../components/header';
import { getAnalytics } from "firebase/analytics";
import Head from "next/head";

function MyApp({ Component, pageProps }: AppProps) {
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current) {
      return;
    }
    ref.current = true;

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_APP_ID,
    };
    const app = initializeApp(firebaseConfig);
    getAnalytics(app);

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      const credential = await getRedirectResult(auth).catch((error) =>
        console.error(error),
      );
      if (credential) {
        const id = await credential.user.getIdToken();
        await fetch("/api/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session: id }),
        });
        router.reload(); // push(replace)にしてsetLoadedすると一瞬サインイン画面が見えてしまう
        return;
      }
      setLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    loaded ? (
      <>
        <Head>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>プリコード (アルファ版)</title>
        </Head>
        <div className="content">
          <Header />
          <Component {...pageProps} />
          <footer>
            <div className="bg-secondary bg-opacity-25 text-center pt-3 pb-3">
              <div>
                <a href="https://twitter.com/@JADENgygo" className="me-3 link-dark">
                  <i className="bi bi-twitter"></i>
                </a>
                <a href="https://priconne-portfolio.vercel.app" className="link-dark">
                  闇プリン開発室
                </a>
              </div>
              <div>画像 &copy; Cygames, Inc.</div>
            </div>
          </footer>
        </div>
      </>
    ) : (
      <Loader />
    )
  );
}

export default MyApp
