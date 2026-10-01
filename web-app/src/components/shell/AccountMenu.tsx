import { Link } from "react-router-dom";
import { LogOut, Settings2, UserRound, Wallet } from "lucide-react";
import { ACCOUNTS_ENABLED } from "../../config";
import { useSelectedElement } from "../../context/selection";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useSignOut } from "./useSignOut";

/**
 * Header account area (from `lg`): sign-in buttons for guests, an avatar menu
 * when signed in, nothing when the build has accounts switched off.
 */
export function AccountMenu() {
  const { isAuthenticated } = useSelectedElement();
  const signOut = useSignOut();
  if (!ACCOUNTS_ENABLED) return null;

  if (!isAuthenticated)
    return (
      <div className="hidden items-center gap-1.5 lg:flex">
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Giriş yap</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/register">Hesap aç</Link>
        </Button>
      </div>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Hesap menüsü"
          className="focus-ring ml-1 hidden size-8 place-items-center rounded-full border border-line-strong bg-surface-2 text-ink-2 transition-colors hover:border-ink-4 hover:text-ink data-[state=open]:border-brand-line data-[state=open]:text-ink lg:grid"
        >
          <UserRound aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Hesap</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/account">
            <Wallet strokeWidth={1.75} />
            Hesabım
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings2 strokeWidth={1.75} />
            Ayarlar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut strokeWidth={1.75} />
          Çıkış
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
