import { getWorks, getSeriesList } from "../lib/notion";
import Gallery from "../components/Gallery";

export const revalidate = 60;

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
    <>
      <section className="hero">
        <h1 className="serif">每張圖，只刺在一個人身上。</h1>
        <p>
          認領即下架。看上哪張，點進去直接預約——不用再私訊來回問「這張還在嗎」。
        </p>
      </section>
      <Gallery works={standalone} series={series} />
    </>
  );
}
