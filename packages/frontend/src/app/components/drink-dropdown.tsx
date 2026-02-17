"use client";

import { useState } from "react";
import PopUpDialogue from "./pop-up-dialogue";

type PickerProps<T extends WithNameAndId> = {
  buttonText: string;
  options: T[];
  selectedOption: T | undefined;
  setSelectedOption: (selected: T | undefined) => void;
};

export default function DrinkDropdown<T extends WithNameAndId>({
  buttonText,
  options,
  setSelectedOption,
}: PickerProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="w-full button text-lg"
        onClick={() => setOpen(true)}
      >
        {buttonText}&hellip;
      </button>
      {open && (
        <PopUpDialogue setOpen={setOpen} title={buttonText}>
          <div
            className="
            px-4 py-2
            flex
            flex-col
            max-h-[90dvh]
            w-[90dvw]
            max-w-4xl
            gap-2"
          >
            <div
              className="
              grid
              grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]
              auto-rows-max
              gap-2
              overflow-y-auto"
            >
              {options
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((option) => (
                  <div
                    key={option.id}
                    className="
                    box-hover
                    cursor-pointer
                    text-nowrap
                    overflow-x-hidden
                    text-ellipsis"
                    onClick={() => {
                      setSelectedOption(option);
                      setOpen(false);
                    }}
                  >
                    {option.name}
                  </div>
                ))}
            </div>
            <button
              type="button"
              className="button self-start text-xl p-4 m-4"
              onClick={() => setOpen(false)}
            >
              Eiku
            </button>
          </div>
        </PopUpDialogue>
      )}
    </>
  );
}
