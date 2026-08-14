import Link from "next/link";
import { getWork, getOpenSlots } from "../../../lib/notion";
import ClaimForm from "../../../components/ClaimForm";

export const revalidate = 60;

export default async function WorkPage({ params }) {
  const { id } = await params;
  const [work, slots] = await Promise.all([getWork(id), getOpenSlots("刺青")]);

  if (work.status !== "可認領") {
    return (
      <div className="public-page claim-page">
        <div className="done">
          <div className="stamp serif">歉</div>
          <h2 className="serif">這張圖已經有主人了</h2>
          <p>「{work.name}」目前無法認領。回圖庫看看其他還開放的圖吧。</p>
          <Link className="cta ghost" href="/">回圖庫</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page claim-page">
      <Link className="back" href="/">← 回圖庫</Link>
      <div className="detail work-detail">
        <div className="art">
          {work.image ? <img src={work.image} alt={work.name} /> : null}
        </div>
        <div>
          <h2 className="serif">{work.name}</h2>
          {work.description ? (
            <p className="work-description">{work.description}</p>
          ) : null}
          <ClaimForm
            workId={work.id}
            workName={work.name}
            slots={slots}
            imageCount={work.imageCount}
            price={work.price}
            minimumSize={work.size}
            recommendedSpot={work.spot}
          />
        </div>
      </div>
    </div>
  );
}
