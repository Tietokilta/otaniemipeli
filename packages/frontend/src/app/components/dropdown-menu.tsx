"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ReactNode } from "react";

type TypedOptionProps<T extends WithNameAndId> = {
  buttonText: string;
  options: T[];
  selectedOption: T | undefined;
  setSelectedOption: (selected: T | undefined) => void;
  renderOption?: (option: T) => ReactNode;
};

type StringOptionProps<T extends string> = {
  buttonText: string;
  options: T[];
  selectedOption: T | undefined;
  setSelectedOption: (selected: T | undefined) => void;
  renderOption?: (option: T) => ReactNode;
};

const optId = (option: string | WithNameAndId) =>
  typeof option === "string" ? option : option.id;
const optName = (option: string | WithNameAndId) =>
  typeof option === "string" ? option : option.name;

export default function DropdownMenu<T extends WithNameAndId>(
  props: TypedOptionProps<T>,
): ReactNode;
export default function DropdownMenu<T extends string>(
  props: StringOptionProps<T>,
): ReactNode;
export default function DropdownMenu<
  T extends WithNameAndId,
  S extends string,
>({
  buttonText,
  options,
  selectedOption,
  setSelectedOption,
  renderOption = optName,
}: TypedOptionProps<T> | StringOptionProps<S>) {
  return (
    <Menu>
      <MenuButton className="w-full button center text-lg">
        {selectedOption ? renderOption(selectedOption as T & S) : buttonText}
        &nbsp;&#9660;
      </MenuButton>
      <MenuItems
        anchor="bottom"
        className="text-base text-tertiary-500 font-bold rounded-md z-50"
      >
        {options
          .sort((a, b) => optName(a).localeCompare(optName(b)))
          .map((option) => (
            <MenuItem key={optId(option)}>
              <div
                className="w-full
                bg-quaternary-500
                data-focus:bg-primary-500
                text-tertiary-500
                data-focus:text-tertiary-900
                p-3
                cursor-pointer"
                onClick={() => setSelectedOption(option as T & S)}
              >
                {renderOption(option as T & S)}
              </div>
            </MenuItem>
          ))}
      </MenuItems>
    </Menu>
  );
}
