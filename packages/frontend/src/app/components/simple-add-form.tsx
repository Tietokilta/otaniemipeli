"use client";

import { useState } from "react";
import PopUpDialogue from "@/app/components/pop-up-dialogue";

interface SimpleAddFormProps {
  buttonText: string;
  dialogTitle: string;
  inputPlaceholder: string;
  buttonClassName?: string;
  onSubmit: (name: string) => Promise<void> | void;
}

export default function SimpleAddForm({
  buttonText,
  dialogTitle,
  inputPlaceholder,
  buttonClassName = "button ml-auto",
  onSubmit,
}: SimpleAddFormProps) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = data.get("name") as string;

    await onSubmit(name);
    setOpen(false);
  }

  return (
    <>
      <button className={buttonClassName} onClick={() => setOpen(true)}>
        {buttonText}
      </button>

      {open && (
        <PopUpDialogue setOpen={setOpen}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow"
          >
            <h2 className="mb-4 text-xl font-semibold">{dialogTitle}</h2>
            <input
              name="name"
              required
              placeholder={inputPlaceholder}
              className="mb-3 w-full rounded border px-3 py-2"
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="button"
              >
                Eiku
              </button>
              <button type="submit" className="button">
                Tallenna
              </button>
            </div>
          </form>
        </PopUpDialogue>
      )}
    </>
  );
}
