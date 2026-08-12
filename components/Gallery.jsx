import Link from "next/link";

const STATUS_PILL = {
  "可認領": ["open", "可認領"],
  "洽談中": ["hold", "洽談中"],
  "已認領": ["gone", "已認領"],
};

export function WorkCard({ w }) {
  const [cls, label] = STATUS_PILL[w.status] || ["gone", w.status];
  const claimable = w.status === "可認領";
  const card = (
    <div className={`card${claimable ? "" : " gone"}`}>
      <div className="art">
        {w.image ? <img src={w.image} alt={w.name} /> : <span className="serif" style={{ fontSize: 64 }}>印</span>}
      </div>
      <div className="card-body">
        <div className="name serif">{w.name}</div>
        <div className="meta">
          <b>{w.price != null ? `NT$ ${w.price.toLocaleString()}` : "詢價"}</b>
          <span>{w.size || ""}</span>
        </div>
        <div className="meta">
          <span></span>
          <span className={`pill ${cls}`}>{label}</span>
        </div>
      </div>
    </div>
  );
  return claimable ? <Link href={`/work/${w.id}`}>{card}</Link> : <div>{card}</div>;
}

function SeriesCard({ s }) {
  const anyOpen = s.open > 0;
  const card = (
    <div className={`card${anyOpen ? "" : " gone"}`}>
      <div className="art">
        {s.cover ? <img src={s.cover} alt={s.name} /> : <span className="serif" style={{ fontSize: 64 }}>系</span>}
      </div>
      <div className="card-body">
        <div className="name serif">{s.name}</div>
        <div className="meta">
          <span>{s.desc || "系列作品"}</span>
        </div>
        <div className="meta">
          <span className="pill open" style={anyOpen ? {} : { opacity: 0.5 }}>
            剩 {s.open}/{s.total} 款可認領
          </span>
        </div>
      </div>
    </div>
  );
  return <Link href={`/series/${s.id}`}>{card}</Link>;
}

export default function Gallery({ works, series = [] }) {
  return (
    <div className="grid">
      {series.map((s) => <SeriesCard key={s.id} s={s} />)}
      {works.map((w) => <WorkCard key={w.id} w={w} />)}
    </div>
  );
}
