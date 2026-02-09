"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

type PickerProps<T extends WithNameAndId> = {
  buttonText: string;
  options: T[] | string[];
  selectedOption: T | undefined;
  setSelectedOption: (selected: T | undefined) => void;
};

export default function DropdownMenu<T extends WithNameAndId>({
  buttonText,
  options,
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
        {buttonText}&nbsp;&#9660;
      </MenuButton>
      <MenuItems
        anchor="right"
        className="text-base text-tertiary-500 font-bold rounded-md z-50"
      >
        {trueOptions
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((option) => (
            <MenuItem key={option.id}>
              <div
                className="w-full
                bg-quaternary-500
                data-focus:bg-primary-500
                text-tertiary-500
                data-focus:text-tertiary-900
                p-3
                cursor-pointer"
                onClick={() => setSelectedOption(option)}
              >
                <p>{option.name}</p>
              </div>
            </MenuItem>
          ))}
      </MenuItems>
    </Menu>
  );
}
