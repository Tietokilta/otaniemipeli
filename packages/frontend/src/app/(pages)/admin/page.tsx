"use client";
import CreateUserForm from "@/app/components/create-user-form";
import UserList from "@/app/components/user-list";
import { useState } from "react";

export default function Home() {
  const [refresh, setRefresh] = useState({});
  return (
    <div className="flex-1 flex flex-col items-center min-h-0">
      <h1 className="text-tertiary-900 text-2xl font-bold">
        Tervetuloa Otaniemipeli-Adminiin!
      </h1>
      <div className="flex-1 min-h-0 flex justify-center flex-wrap lg:flex-nowrap gap-x-4 gap-y-10 overflow-auto">
        <CreateUserForm
          className="w-full lg:w-100"
          onCreate={() => setRefresh({})}
        />
        <UserList className="w-full lg:w-100" refresh={refresh} />
      </div>
    </div>
  );
}
