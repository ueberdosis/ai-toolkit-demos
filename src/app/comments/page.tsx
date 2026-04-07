"use client";

import dynamic from "next/dynamic";
import Comments from "../../demos/comments/React/Comments";
import "../../demos/comments/style.scss";

function Page() {
  return <Comments />;
}

export default dynamic(() => Promise.resolve(Page), { ssr: false });
