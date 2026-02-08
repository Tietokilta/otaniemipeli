"use client";

import { useState } from "react";
import PopUpDialogue from "@/app/components/pop-up-dialogue";

interface SimpleAddFormProps {
  buttonText: string;
  dialogTitle: string;
  dialogText?: string;
  buttonClassName?: string;
  disabled?: boolean;
  onAccept: () => void;
}

export default function SimpleConfirmedButton({
  buttonText,
  dialogTitle,
  dialogText = "Oletko varma?",
  buttonClassName = "button",
  disabled = false,
  onAccept,
}: SimpleAddFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={buttonClassName}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {buttonText}
      </button>

      {open && (
        <PopUpDialogue setOpen={setOpen} title={dialogTitle}>
          <p className="text-lg">{dialogText}</p>
          <div className="flex justify-between px-4 py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="button"
            >
              Eiku
            </button>
            <button type="button" className="button" onClick={onAccept}>
              Vahvista
            </button>
          </div>
        </PopUpDialogue>
      )}
    </>
  );
}
