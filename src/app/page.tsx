import Link from "next/link"

import { LatestPost } from "~/app/_components/post"
import { IdCard } from "./_components/idcard"
import { HydrateClient } from "~/trpc/server"

export default async function Home() {
  return (
    <HydrateClient>
      <main className="">
        <IdCard/>
      </main>
    </HydrateClient>
  )
}
