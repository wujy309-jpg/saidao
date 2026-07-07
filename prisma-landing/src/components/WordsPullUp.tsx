import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
}

export default function WordsPullUp({
  text,
  className = "",
  showAsterisk = false,
}: WordsPullUpProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const words = text.split(" ");

  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{
            delay: i * 0.08,
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block mr-[0.25em]"
        >
          {showAsterisk && i === words.length - 1 ? (
            <>
              {word}
              <sup
                className="absolute"
                style={{
                  top: "0.65em",
                  right: "-0.3em",
                  fontSize: "0.31em",
                }}
              >
                *
              </sup>
            </>
          ) : (
            word
          )}
        </motion.span>
      ))}
    </span>
  );
}
