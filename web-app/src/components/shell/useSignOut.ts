import { useNavigate } from "react-router-dom";
import { useSelectedElement } from "../../context/selection";
import { clearSession } from "../../services/session";

/** Returns a handler that clears the session and goes home. */
export function useSignOut(): () => void {
  const { setIsAuthenticated } = useSelectedElement();
  const navigate = useNavigate();
  return () => {
    clearSession();
    setIsAuthenticated(false);
    navigate("/");
  };
}
