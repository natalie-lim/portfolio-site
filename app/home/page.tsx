export default function HomePage() {
  return (
    <div className="flex flex-1 grid-cols-2 items-center justify-between m-36 bg-slate-950 font-sans text-white animate-[fade-in_0.5s_ease-out_forwards]">
      <div className="">
        <h1 className="text-3xl font-semibold">welcome to my brain</h1>
        <p className="mt-4 text-zinc-400">
          full-stack. machine learning. neuro. design.
        </p>
      </div>
      <div>
        <p>insert brain here</p>
      </div>
    </div>
  );
}
