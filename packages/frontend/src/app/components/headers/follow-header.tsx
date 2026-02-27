"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TiKLogo from "../../../../public/TiKprofiilikuva.png";
import React from "react";
import { FlickerText } from "@/app/components/flicker-text";

export default function FollowHeader() {
  const router = useRouter();
  const className =
    "flex items-end justify-center pb-4 px-4 border-l-1 text-4xl border-juvu-kulta text-juvu-sini-500 h-full hover:bg-juvu-sini-900";
  return (
    <div className="flex items-end justify-right w-full h-[12dvh] px-4 mb-4 bg-primary-900 border-juvu-kulta border-b-1">
      <div className="flex center h-full py-1 mr-auto">
        <Image
          src={TiKLogo}
          alt="Header Logo"
          className="w-auto h-full rounded-full"
          priority
        />
        <FlickerText>
          <h2
            className=" pl-6 text-juvu-sini-500 select-none ml-auto text-6xl"
            onClick={() => router.push("/")}
          >
            Museobileet?
          </h2>
        </FlickerText>
        <FlickerText>
          <h2
            className="pl-6 text-juvu-sini-500 select-none ml-auto text-6xl"
            onClick={() => router.push("/")}
          >
            Otaniemipeli!
          </h2>
        </FlickerText>
      </div>
      <div className="flex h-full items-center pt-6">
        <nav className="flex cursor-default h-full rounded-md bottom">
          <div
            className={className}
            onClick={() => {
              router.push("/follow");
            }}
          >
            <h3>Etusivu</h3>
          </div>
          <div
            className={className}
            onClick={() => {
              router.push("/follow/board");
            }}
          >
            <h3>Vaihda lauta</h3>
          </div>
        </nav>
      </div>
    </div>
  );
}
