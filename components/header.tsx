import { Nav, Navbar, Container } from "react-bootstrap";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getAuth } from "firebase/auth";

export const Header = () => {
  const router = useRouter();
  const auth = getAuth();

  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    setAuthenticated(auth.currentUser !== null);
  });

  const logOut = async () => {
    await fetch("/api/signout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    router.reload();
  };

  return (
    <Navbar
      collapseOnSelect
      expand="md"
      bg="black"
      className="bg-gradient pt-3 pb-3"
      variant="dark"
    >
      <Container>
        <Navbar.Brand className="fs-3">
          <Link href="/">
            <a className="link-light link">プリコード (アルファ版)</a>
          </Link>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav>
            <div className="text-nowrap text-white row row-cols-auto">
              <div className="col">
                <Nav.Link href="#" className="link-light link" onClick={() => router.push("/")}>ホーム</Nav.Link>
              </div>
              {authenticated && (
                <>
                  <div className="col" id="delete">
                    <Nav.Link href="#" className="link-light link" onClick={() => router.push("/delete")}>アカウント削除</Nav.Link>
                  </div>
                </>
              )}
              <div className="col">
                {authenticated ? (
                  <Nav.Link href="#" className="link-light link" onClick={logOut}>ログアウト</Nav.Link>
                ) : (
                  <div id="login">
                    <Nav.Link href="#" className="link-light link" onClick={() => router.push("/signin")}>新規登録/ログイン</Nav.Link>
                  </div>
                )}
              </div>
              {authenticated && (
                <div className="col">
                  {/* 位置をそろえるためにNav.Linkにしている */}
                  <Nav.Link href="#" className="text-light">@{(auth.currentUser as any)?.reloadUserInfo?.screenName}</Nav.Link>
                </div>
              )}
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};
