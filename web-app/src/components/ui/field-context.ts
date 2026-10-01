import { createContext, useContext } from "react";

/** Attributes a `Field` hands to the control inside it. */
export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  required?: boolean;
}

export const FieldContext = createContext<FieldControlProps | null>(null);

/**
 * Id, description and invalid state from the surrounding `Field`, or `{}` outside one.
 * Controls spread it before their own props so explicit props still win.
 */
export function useFieldControl(): Partial<FieldControlProps> {
  return useContext(FieldContext) ?? {};
}
