import 'dotenv/config'
import { syncLearningContentFromDisk } from '../src/lib/sync-learning-content'

async function main() {
  const { upserted } = await syncLearningContentFromDisk()
  console.log(`Synced ${upserted} items from /content`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
