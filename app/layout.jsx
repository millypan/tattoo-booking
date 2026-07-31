import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "HALO SIGIL 拾光印記所｜米粒刺青預約",
  description: "認領圖與客製刺青預約｜桃園刺青師 米粒 mly.ink",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        <header className="site">
          <Link href="/">
            <div className="wordmark serif">
              拾光印記所
              <small>HALO SIGIL・米粒 mly.ink</small>
            </div>
          </Link>
          <nav className="top">
            <Link href="/" className="on">認領圖</Link>
            <Link href="/custom">客製刺青</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site">
          <span>HALO SIGIL 拾光印記所・桃園</span>
          <span>諮詢排上午・刺青時長依圖大小另約</span>
        </footer>
      </body>
    </html>
  );
}
