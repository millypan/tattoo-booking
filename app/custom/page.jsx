import CustomForm from "../../components/CustomForm";

export const metadata = { title: "客製刺青｜HALO SIGIL 拾光印記所" };

export default function CustomPage() {
  return (
    <div className="public-page custom-page">
      <section className="hero">
        <h1 className="serif">你想留下什麼故事呢？</h1>
        <p>
          簡單描述你的想法，讓我們之後的溝通更有效率。諮詢當天，我會畫出約八成的草圖，讓你看見完整的構圖、色系與報價。
        </p>
      </section>
      <CustomForm />
    </div>
  );
}
