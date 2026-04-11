/**
 * Lightweight CSS-only animated background.
 * Removed framer-motion mouse-tracking (was rendering 23 spring-animated
 * elements and calling setState on every mousemove — massive perf hit).
 * Now uses pure CSS animations for the same visual effect at near-zero cost.
 */
const AnimatedBackground = () => {
  return (
    <div className="bokeh-container mesh-gradient" aria-hidden>
      {/* Deep Sapphire Orb — top-left */}
      <div
        className="bokeh-orb"
        style={{
          width: "520px", height: "520px",
          top: "-12%", left: "-8%",
          background: "radial-gradient(circle, hsl(220 65% 55% / 0.12), transparent 70%)",
          filter: "blur(100px)",
          animationDelay: "0s",
          animationDuration: "24s",
        }}
      />

      {/* Warm Gold Orb — bottom-right */}
      <div
        className="bokeh-orb"
        style={{
          width: "600px", height: "600px",
          bottom: "-18%", right: "-10%",
          background: "radial-gradient(circle, hsl(42 72% 65% / 0.08), transparent 70%)",
          filter: "blur(120px)",
          animationDelay: "-8s",
          animationDuration: "28s",
        }}
      />

      {/* Midnight Blue Orb — right-center */}
      <div
        className="bokeh-orb"
        style={{
          width: "380px", height: "380px",
          top: "38%", right: "5%",
          background: "radial-gradient(circle, hsl(225 60% 45% / 0.12), transparent 70%)",
          filter: "blur(70px)",
          animationDelay: "-14s",
          animationDuration: "20s",
        }}
      />

      {/* Static gold particles — CSS animated, no JS */}
      {[0,1,2,3,4,5,6,7].map((i) => (
        <div
          key={i}
          className="gold-particle"
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            bottom: `${(i * 19 + 5) % 60}%`,
            width: i % 3 === 0 ? "3px" : "2px",
            height: i % 3 === 0 ? "3px" : "2px",
            animationDelay: `${(i * 1.3) % 12}s`,
            animationDuration: `${10 + (i % 5) * 2}s`,
            opacity: 0.3 + (i % 4) * 0.1,
            background: i % 3 === 0 ? "hsl(215 100% 60%)" : "hsl(43 64% 75%)",
          }}
        />
      ))}
    </div>
  );
};

export default AnimatedBackground;
