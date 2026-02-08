import { Dispatch, ReactNode, SetStateAction } from "react";

const PopUpDialogue = ({
  children,
  title,
  setOpen,
  disabled = false,
}: {
  children: ReactNode;
  title?: ReactNode;
  setOpen: Dispatch<SetStateAction<boolean>>;
  disabled?: boolean;
}) => {
  const handleClose = () => {
    if (disabled) return;
    setOpen(false);
  };

  return (
    <div
      className="cursor-default fixed inset-0 z-50 flex center bg-black/50"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target !== e.currentTarget) return;
        handleClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* stop clicks inside from reaching backdrop */}
      <div
        className="flex flex-col gap-2 bg-white rounded shadow-lg max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex bg-primary-500 w-full p-2">
          <div>{title}</div>
          <button
            className="ml-auto h-6 w-6 bg-tertiary-500 hover:bg-tertiary-100 text-secondary-100 center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label="Close"
            type="button"
            disabled={disabled}
          >
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default PopUpDialogue;
