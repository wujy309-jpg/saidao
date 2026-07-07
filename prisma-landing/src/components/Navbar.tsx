const navLinks = [
  "Our story",
  "Collective",
  "Workshops",
  "Programs",
  "Inquiries",
];

export default function Navbar() {
  return (
    <nav className="absolute top-0 left-1/2 -translate-x-1/2 z-30">
      <div className="bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-8">
        <ul className="flex items-center gap-3 sm:gap-6 md:gap-12 lg:gap-14">
          {navLinks.map((link) => (
            <li key={link}>
              <a
                href="#"
                className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap transition-colors duration-200"
                style={{
                  color: "rgba(225, 224, 204, 0.8)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#E1E0CC")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color =
                    "rgba(225, 224, 204, 0.8)")
                }
              >
                {link}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
