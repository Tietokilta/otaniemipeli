import React, { Dispatch, RefObject, SetStateAction } from "react";

const PopUpDialogue = ({
  children,
  justOpened,
  setOpen,
}: {
  children: React.ReactNode;
  justOpened?: RefObject<boolean>;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex center bg-black/50"
      onClick={(e) => {
        if (justOpened && justOpened.current) return;
        if (e.target !== e.currentTarget) return;
        setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* stop clicks inside from reaching backdrop */}
      <div
        className="flex flex-col gap-2 bg-white rounded shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex bg-primary-500 w-full p-2">
          <button
            className="ml-auto h-6 w-6 bg-tertiary-500 hover:bg-tertiary-100 text-secondary-100 center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close"
            type="button"
          >
            <p className="center">X</p>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default PopUpDialogue;
