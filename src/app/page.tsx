import { IdCard } from "./_components/idcard"
import { HydrateClient } from "~/trpc/server"

export default async function Home() {
  return (
    <HydrateClient>
      <main className="w-dvw h-dvh">
        <IdCard/>
      </main>
    </HydrateClient>
  )
}
