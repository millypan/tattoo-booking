import Link from "next/link";
import { getSeries, getWorks } from "../../../lib/notion";
import { WorkCard } from "../../../components/Gallery";

export const revalidate = 60;

export default async function SeriesPage({ params }) {
  const { id } = await params;
  const [series, works] = await Promise.all([getSeries(id), getWorks()]);
  const members = works.filter((w) => w.seriesId === series.id);
  const open = members.filter((w) => w.status === "可認領").length;

  return (
    <div className="public-page claim-page">
      <Link className="back" href="/">← 回圖庫</Link>
      <div className="detail series-detail" style={{ marginBottom: 36 }}>
        <div className="art">
          {series.cover ? <img src={series.cover} alt={series.name} /> : null}
        </div>
        <div>
          <h2 className="serif">{series.name}</h2>
          {series.desc ? <p style={{ color: "var(--bone-dim)" }}>{series.desc}</p> : null}
          <p style={{ color: "var(--bone-dim)" }}>
            這個系列共 {members.length} 款，每一款只刺在一個人身上——目前剩{" "}
            <b style={{ color: "var(--bone)" }}>{open} 款</b>可認領。點下面選你要的那款。
          </p>
        </div>
      </div>
      <div className="grid">
        {members.map((w) => <WorkCard key={w.id} w={w} />)}
      </div>
    </div>
  );
}
