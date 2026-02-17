"use client";

import { useState } from "react";
import PopUpDialogue from "@/app/components/pop-up-dialogue";

interface SimpleAddFormProps {
  buttonText: string;
  dialogTitle: string;
  dialogText?: string;
  buttonClassName?: string;
  disabled?: boolean;
  onAccept: () => void | Promise<void>;
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
  const [pending, setPending] = useState(false);

  const handleAccept = async () => {
    setPending(true);
    try {
      await onAccept();
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

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
        <PopUpDialogue setOpen={setOpen} title={dialogTitle} disabled={pending}>
          <div className="px-4 py-2">
            <p className="text-lg">{dialogText}</p>
            <div className="flex justify-between px-4 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="button"
              >
                Eiku
              </button>
              <button
                type="button"
                className="button"
                disabled={pending}
                onClick={handleAccept}
              >
                Vahvista
              </button>
            </div>
          </div>
        </PopUpDialogue>
      )}
    </>
  );
}
