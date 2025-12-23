"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import React, { Dispatch, SetStateAction } from "react";

type PickerProps<T extends WithNameAndId> = {
  buttonText: string;
  options: T[] | string[];
  selectedOption: T | undefined;
  setSelectedOption: Dispatch<SetStateAction<T | undefined>>;
};

export default function DropdownMenu<T extends WithNameAndId>({
  buttonText,
  options,
  selectedOption,
  setSelectedOption,
}: PickerProps<T>) {
  const trueOptions: T[] = options.map((option) => {
    if (typeof option === "string") {
      return { id: option, name: option } as T;
    }
    return option;
  });
  return (
    <Menu>
      <MenuButton className="w-full button center text-lg">
        {buttonText}
      </MenuButton>
      <MenuItems
        anchor="right"
        className="text-base text-gray-900 font-bold rounded-2xl z-50"
      >
        {trueOptions
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((option) => (
            <MenuItem key={option.id}>
              <div
                className="w-full
                bg-juvu-sini-800
                data-focus:bg-juvu-sini-600
                hover:bg-juvu-sini-600
                text-juvu-kulta
                hover:text-juvu-sini-800
                p-3"
                onClick={() =>
                  setSelectedOption((prev) =>
                    selectedOption && prev?.id === option.id
                      ? undefined
                      : option,
                  )
                }
              >
                <p>{option.name}</p>
              </div>
            </MenuItem>
          ))}
      </MenuItems>
    </Menu>
  );
}
