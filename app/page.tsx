import { TypingText } from "./effects/TypingText";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-slate-950 font-sans ">
      <TypingText text="hi, my name is natalie lim" color="text-white" />
    </div>
  );
}
