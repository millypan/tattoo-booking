import Link from "next/link";
import { getWork, getOpenSlots } from "../../../lib/notion";
import ClaimForm from "../../../components/ClaimForm";

export const revalidate = 60;

export default async function WorkPage({ params }) {
  const { id } = await params;
  const [work, slots] = await Promise.all([getWork(id), getOpenSlots("刺青")]);

  if (work.status !== "可認領") {
    return (
      <div className="done">
        <div className="stamp serif">歉</div>
        <h2 className="serif">這張圖已經有主人了</h2>
        <p>「{work.name}」目前無法認領。回圖庫看看其他還開放的圖吧。</p>
        <Link className="cta ghost" href="/">回圖庫</Link>
      </div>
    );
  }

  return (
    <>
      <Link className="back" href="/">← 回圖庫</Link>
      <div className="detail">
        <div className="art">
          {work.image ? <img src={work.image} alt={work.name} /> : null}
        </div>
        <div>
          <h2 className="serif">{work.name}</h2>
          <ul className="facts">
            <li><span>價格</span><b>{work.price != null ? `NT$ ${work.price.toLocaleString()}` : "詢價"}</b></li>
            <li><span>最小建議尺寸</span><b>{work.size || "—"}</b></li>
            <li><span>風格</span><b>{work.styles.join("・") || "—"}</b></li>
            <li><span>建議部位</span><b>{work.spot || "—"}</b></li>
          </ul>
          <ClaimForm
            workId={work.id}
            workName={work.name}
            slots={slots}
            imageCount={work.imageCount}
          />
        </div>
      </div>
    </>
  );
}
