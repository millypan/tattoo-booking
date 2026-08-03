import CustomForm from "../../components/CustomForm";

export const metadata = { title: "客製刺青｜HALO SIGIL 拾光印記所" };

export default function CustomPage() {
  return (
    <div className="public-page custom-page">
      <section className="hero">
        <h1 className="serif">你想在身上留下什麼故事？</h1>
        <p>
          先用幾分鐘告訴我你的想法，我確認能不能做之後，會約你當面聊——
          當天現場畫出八成草稿、直接報價。想法越具體，我們見面聊得越快。
        </p>
      </section>
      <CustomForm />
    </div>
  );
}
