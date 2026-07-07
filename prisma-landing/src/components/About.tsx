import { useRef } from "react";
import WordsPullUpMultiStyle from "./WordsPullUpMultiStyle";
import AnimatedLetter from "./AnimatedLetter";

const bodyText =
  "Over the last seven years, I have worked with Parallax, a Berlin-based production house that crafts cinema, series, and Noir Studio in Paris. Together, we have created work that has earned international acclaim at several major festivals.";

export default function About() {
  const bodyRef = useRef<HTMLParagraphElement>(null);

  return (
    <section className="bg-black py-24 sm:py-32 md:py-40 px-4">
      <div className="bg-[#101010] max-w-6xl mx-auto rounded-2xl md:rounded-3xl px-6 sm:px-10 md:px-16 py-16 sm:py-20 md:py-28 text-center">
        {/* Label */}
        <p className="text-primary text-[10px] sm:text-xs tracking-widest uppercase mb-6 sm:mb-8">
          Visual arts
        </p>

        {/* Heading */}
        <div className="mb-10 sm:mb-14 md:mb-16">
          <WordsPullUpMultiStyle
            containerClassName="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-3xl mx-auto leading-[0.95] sm:leading-[0.9]"
            segments={[
              { text: "I am Marcus Chen,", className: "font-normal" },
              {
                text: "a self-taught director.",
                className: "italic font-serif",
              },
              {
                text: "I have skills in color grading, visual effects, and narrative design.",
                className: "font-normal",
              },
            ]}
          />
        </div>

        {/* Body with scroll-linked character animation */}
        <p
          ref={bodyRef}
          className="text-[#DEDBC8] text-xs sm:text-sm md:text-base max-w-3xl mx-auto leading-relaxed"
        >
          {bodyText.split("").map((char, i) => (
            <AnimatedLetter
              key={i}
              char={char}
              index={i}
              total={bodyText.length}
              targetRef={bodyRef}
            />
          ))}
        </p>
      </div>
    </section>
  );
}
