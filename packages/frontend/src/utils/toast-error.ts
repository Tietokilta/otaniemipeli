import { toast } from "sonner";

/** Extracts the error message and displays it as an error toast. */
export function toastError(error: unknown): void {
  const message = error instanceof Error ? error.message : "Tuntematon virhe";
  toast.error(message, {
    classNames: {
      error: "!bg-red-500 !text-white",
    },
  });
}
