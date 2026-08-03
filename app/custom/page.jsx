import CustomForm from "../../components/CustomForm";

export const metadata = { title: "客製刺青｜HALO SIGIL 拾光印記所" };

export default function CustomPage() {
  return (
    <div className="public-page custom-page">
      <section className="hero">
        <h1 className="serif">你想留下什麼故事呢？</h1>
        <p>
          先簡單描述你的想法，我會確認風格、部位與圖面是否適合施作。確認可以承接後，再一起安排諮詢時間。
        </p>
      </section>
      <CustomForm />
    </div>
  );
}
