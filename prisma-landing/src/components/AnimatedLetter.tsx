import { motion, useScroll, useTransform } from "framer-motion";

interface AnimatedLetterProps {
  char: string;
  index: number;
  total: number;
  targetRef: React.RefObject<HTMLElement | null>;
}

export default function AnimatedLetter({
  char,
  index,
  total,
  targetRef,
}: AnimatedLetterProps) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start 0.8", "end 0.2"],
  });

  const charProgress = index / total;
  const opacity = useTransform(
    scrollYProgress,
    [charProgress - 0.1, charProgress + 0.05],
    [0.2, 1]
  );

  return (
    <motion.span style={{ opacity }} className="inline">
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
}
