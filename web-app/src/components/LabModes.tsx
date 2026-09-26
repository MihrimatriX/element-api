import { motion } from "framer-motion";
import { Link, NavLink } from "react-router-dom";
import { FlaskConical, Search, Sigma } from "lucide-react";

const modes = [
  { to: "/lab", label: "Serbest oyun", icon: FlaskConical, end: true },
  { to: "/lab/formula", label: "Formülü kur", icon: Sigma, end: false },
  {
    to: "/lab/detective",
    label: "Element dedektifi",
    icon: Search,
    end: false,
  },
] as const;

const quests = [
  {
    to: "/lab/formula",
    icon: Sigma,
    title: "Formülü kur",
    blurb: "Atomları doğru sıraya diz",
  },
  {
    to: "/lab/detective",
    icon: Search,
    title: "Dedektif",
    blurb: "İpuçlarından elementi bul",
  },
] as const;

/** On /lab: inviting side-quest chips. On formula/detective: full mode switcher. */
export default function LabModes({ secondary = false }: { secondary?: boolean }) {
  if (secondary) {
    return (
      <nav className="lab-quests" aria-label="Yan görevler">
        <span className="lab-quests-label">Yan görev</span>
        <div className="lab-quests-row">
          {quests.map((q) => (
            <Link key={q.to} to={q.to} className="lab-quest">
              <span className="lab-quest-icon" aria-hidden="true">
                <q.icon size={16} />
              </span>
              <span className="lab-quest-copy">
                <strong>{q.title}</strong>
                <em>{q.blurb}</em>
              </span>
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="lab-modes" aria-label="Laboratuvar modları">
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
