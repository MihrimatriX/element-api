import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { FlaskConical, Search, Sigma } from "lucide-react";

const modes = [
  { to: "/lab", label: "Birleştir", icon: FlaskConical, end: true },
  { to: "/lab/formula", label: "Formülü kur", icon: Sigma, end: false },
  { to: "/lab/detective", label: "Element dedektifi", icon: Search, end: false },
] as const;

export default function LabModes() {
  return (
    <nav className="lab-modes" aria-label="Laboratuvar oyunları">
      {modes.map((mode) => (
        <NavLink
          key={mode.to}
          to={mode.to}
          end={mode.end}
          className={({ isActive }) => (isActive ? "is-active" : undefined)}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="lab-mode-pill"
                  className="lab-mode-pill"
                  aria-hidden="true"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              )}
              <mode.icon size={15} />
              <span className="lab-mode-label">{mode.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
