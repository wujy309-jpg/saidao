import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import WordsPullUpMultiStyle from "./WordsPullUpMultiStyle";

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

interface FeatureCardProps {
  index: number;
  children: React.ReactNode;
  className?: string;
}

function FeatureCard({ index, children, className = "" }: FeatureCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      custom={index}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={cardVariants}
      className={`rounded-2xl md:rounded-3xl overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <span className="text-gray-400 text-xs sm:text-sm">{text}</span>
    </li>
  );
}

function LearnMore() {
  return (
    <a
      href="#"
      className="inline-flex items-center gap-1.5 text-primary text-xs sm:text-sm mt-4 group"
    >
      Learn more
      <ArrowRight
        className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
        style={{ transform: "rotate(-45deg)" }}
      />
    </a>
  );
}

export default function Features() {
  return (
    <section className="min-h-screen bg-black relative px-4 sm:px-6 py-20 sm:py-28">
      {/* Background noise */}
      <div className="absolute inset-0 bg-noise opacity-[0.15] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <WordsPullUpMultiStyle
            containerClassName="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal"
            segments={[
              {
                text: "Studio-grade workflows for visionary creators.",
                className: "text-[#DEDBC8]",
              },
              {
                text: "Built for pure vision. Powered by art.",
                className: "text-gray-500",
              },
            ]}
          />
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-2 md:gap-1 lg:h-[480px]">
          {/* Card 1 — Video */}
          <FeatureCard index={0} className="relative">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <p className="text-sm sm:text-base font-medium" style={{ color: "#E1E0CC" }}>
                Your creative canvas.
              </p>
            </div>
          </FeatureCard>

          {/* Card 2 — Project Storyboard */}
          <FeatureCard index={1} className="bg-[#212121] p-5 sm:p-6 flex flex-col">
            <img
              src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85"
              alt="Storyboard icon"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded mb-4 object-cover"
            />
            <h3 className="text-[#E1E0CC] text-base sm:text-lg font-medium mb-4">
              <span className="text-gray-500 mr-1">01</span>
              Project Storyboard.
            </h3>
            <ul className="space-y-2.5 flex-1">
              <CheckItem text="Visual timeline of your project milestones" />
              <CheckItem text="Drag-and-drop scene sequencing" />
              <CheckItem text="Real-time collaboration with your team" />
              <CheckItem text="Export to PDF or shareable link" />
            </ul>
            <LearnMore />
          </FeatureCard>

          {/* Card 3 — Smart Critiques */}
          <FeatureCard index={2} className="bg-[#212121] p-5 sm:p-6 flex flex-col">
            <img
              src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85"
              alt="Critiques icon"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded mb-4 object-cover"
            />
            <h3 className="text-[#E1E0CC] text-base sm:text-lg font-medium mb-4">
              <span className="text-gray-500 mr-1">02</span>
              Smart Critiques.
            </h3>
            <ul className="space-y-2.5 flex-1">
              <CheckItem text="AI-powered analysis of composition and color" />
              <CheckItem text="Contextual creative notes from mentors" />
              <CheckItem text="Integrations with Figma, After Effects, and more" />
            </ul>
            <LearnMore />
          </FeatureCard>

          {/* Card 4 — Immersion Capsule */}
          <FeatureCard index={3} className="bg-[#212121] p-5 sm:p-6 flex flex-col">
            <img
              src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85"
              alt="Capsule icon"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded mb-4 object-cover"
            />
            <h3 className="text-[#E1E0CC] text-base sm:text-lg font-medium mb-4">
              <span className="text-gray-500 mr-1">03</span>
              Immersion Capsule.
            </h3>
            <ul className="space-y-2.5 flex-1">
              <CheckItem text="Silence notifications during deep work" />
              <CheckItem text="Ambient soundscapes for focus" />
              <CheckItem text="Syncs with your calendar and deadlines" />
            </ul>
            <LearnMore />
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}
