import { getWorks, getSeriesList } from "../lib/notion";
import Gallery from "../components/Gallery";

// 首頁同時是極簡排程的最後一道補漏入口；不可被整頁快取，否則訪客打開首頁時
// 看似有請求、實際卻不會重新執行 getWorks() 內的對帳。
export const dynamic = "force-dynamic";

export default async function Home() {
  const [works, seriesList] = await Promise.all([getWorks(), getSeriesList()]);
  const standalone = works.filter((w) => !w.seriesId);
  const series = seriesList
    .map((s) => {
      const members = works.filter((w) => w.seriesId === s.id);
      return {
        ...s,
        total: members.length,
        open: members.filter((w) => w.status === "可認領").length,
      };
    })
    .filter((s) => s.total > 0);

  return (
    <div className="home-page">
      <section className="hero">
        <h1 className="serif">有哪一張圖，剛好讓你停下來？</h1>
        <p>
          每張認領圖，只會陪伴一個人。喜歡的話，可以點進作品看看細節與可預約時間；完成認領後，作品就會下架。
        </p>
      </section>
      <Gallery works={standalone} series={series} />
    </div>
  );
}
